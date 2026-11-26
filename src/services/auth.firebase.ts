/**
 * [파일 목적] VELOMAX Firebase Authentication + Cloud Firestore 프로필 인증 서비스 (v1)
 * [책임]
 *   - Firebase Authentication 이메일/비밀번호 회원가입 및 로그인
 *   - Firestore /users/{uid} 문서 생성·조회·수정 (birthDate 기준 만나이 동적 계산)
 *   - 참여 형태(participationType) 기반 일반인('general') / 운동인('athlete') 자동 분류
 *   - 비회원(게스트) sessionStorage 세션 관리 (Firestore 미저장)
 */

import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type {
  GenderOption,
  GuestLoginInput,
  ParticipationType,
  TrainingExperience,
  UserGroup,
  UserProfile,
  UserProfileUpdateInput,
  UserRegistrationInput,
} from '../types/domain';
import { calculateInternationalAge } from '../utils/format';
import {
  validateGuestLoginInput,
  validateLoginInput,
  validateProfileUpdateInput,
  validateRegistrationInput,
} from '../utils/validation';

const GUEST_SESSION_KEY = 'velomax_v1_guest_session';

/**
 * 회원가입 중 onAuthStateChanged가 프로필 문서 생성 완료 전에 먼저 실행되는 레이스를 방지하기 위한 플래그
 */
let activeSignupInProgress = false;

/**
 * [기능] 운동 참여 형태에 따라 일반인('general') 또는 운동인('athlete')으로 자동 분류합니다.
 */
export function classifyUserGroup(
  participationType: ParticipationType
): UserGroup {
  return participationType === 'athlete_training' ? 'athlete' : 'general';
}

/**
 * Firebase Auth 오류 코드를 이해하기 쉬운 한국어 안내 문구로 변환합니다.
 */
export function mapFirebaseAuthErrorKo(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일 주소입니다. 이메일 로그인 탭을 이용해 주세요.';
    case 'auth/weak-password':
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    case 'auth/invalid-email':
      return '올바른 이메일 주소를 입력해 주세요.';
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔에서 이메일/비밀번호 로그인 방식이 아직 활성화되지 않았습니다. Authentication > Sign-in method에서 이메일/비밀번호를 사용 설정해 주세요.';
    case 'auth/too-many-requests':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
    case 'auth/network-request-failed':
      return '네트워크 연결 상태를 확인한 뒤 다시 시도해 주세요.';
    default:
      return error instanceof Error
        ? error.message
        : '인증 처리 중 오류가 발생했습니다.';
  }
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return new Date().toISOString();
}

function mapFirestoreUserDoc(
  uid: string,
  data: Record<string, unknown>
): UserProfile {
  const birthDate =
    typeof data.birthDate === 'string' && data.birthDate.length === 10
      ? data.birthDate
      : '2000-01-01';
  const participationType: ParticipationType =
    data.participationType === 'athlete_training'
      ? 'athlete_training'
      : 'recreational';

  return {
    id: uid,
    name: typeof data.name === 'string' ? data.name : '회원',
    email: typeof data.email === 'string' ? data.email : '',
    birthDate,
    age: calculateInternationalAge(birthDate),
    gender: (data.gender as GenderOption) || 'unspecified',
    trainingExperience:
      (data.trainingExperience as TrainingExperience) || '6to12months',
    participationType,
    userGroup: classifyUserGroup(participationType),
    isGuest: false,
    createdAt: timestampToIso(data.createdAt),
  };
}

/**
 * Firestore /users/{uid} 문서를 조회하거나, Auth에만 존재하는 계정의 기본 프로필 문서를 보정 생성합니다.
 */
async function fetchOrBootstrapUserProfile(
  uid: string,
  fallbackEmail: string,
  fallbackName: string | null
): Promise<UserProfile> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path, '회원 프로필 조회');
  }

  if (snap.exists()) {
    return mapFirestoreUserDoc(uid, snap.data() as Record<string, unknown>);
  }

  // Firebase Auth 콘솔 등에서 직접 생성되어 프로필 문서가 아직 없는 계정에 대한 안전한 초기 문서 생성
  const normalizedEmail = fallbackEmail.trim().toLowerCase();
  if (normalizedEmail.length < 5 || normalizedEmail.length > 120) {
    handleFirestoreError(
      new Error(
        `회원 프로필 초기 문서 생성 불가: 계정 이메일('${normalizedEmail || '없음'}')이 firestore.rules 길이 규격(5~120자)을 충족하지 않습니다.`
      ),
      OperationType.CREATE,
      path,
      '초기 회원 프로필 검증'
    );
  }

  const safeName = (fallbackName?.trim() || normalizedEmail.split('@')[0] || 'VELOMAX 회원').slice(0, 30);
  const normalizedName = safeName.length >= 2 ? safeName : `${safeName}회원`;
  const defaultBirthDate = '2000-01-01';
  const defaultParticipation: ParticipationType = 'recreational';

  try {
    await setDoc(ref, {
      uid,
      name: normalizedName,
      email: normalizedEmail,
      birthDate: defaultBirthDate,
      gender: 'unspecified',
      trainingExperience: '6to12months',
      participationType: defaultParticipation,
      userGroup: classifyUserGroup(defaultParticipation),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path, '초기 회원 프로필 생성');
  }

  return {
    id: uid,
    name: normalizedName,
    email: normalizedEmail,
    birthDate: defaultBirthDate,
    age: calculateInternationalAge(defaultBirthDate),
    gender: 'unspecified',
    trainingExperience: '6to12months',
    participationType: defaultParticipation,
    userGroup: 'general',
    isGuest: false,
    createdAt: new Date().toISOString(),
  };
}

function getGuestSessionUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed?.isGuest) return null;
    return {
      ...parsed,
      age: calculateInternationalAge(parsed.birthDate, new Date(), parsed.age),
    };
  } catch {
    return null;
  }
}

function clearGuestSessionUser(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(GUEST_SESSION_KEY);
}

export const firebaseAuthService = {
  /**
   * 앱 초기화 시 Firebase Auth 상태 변화 구독 (회원 로그인 복원 및 비회원 세션 폴백)
   */
  subscribeAuthState(
    onUserResolved: (user: UserProfile | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    return onAuthStateChanged(auth, (fbUser) => {
      if (activeSignupInProgress) {
        return;
      }

      if (!fbUser) {
        onUserResolved(getGuestSessionUser());
        return;
      }

      void fetchOrBootstrapUserProfile(
        fbUser.uid,
        fbUser.email ?? '',
        fbUser.displayName
      )
        .then((profile) => {
          clearGuestSessionUser();
          onUserResolved(profile);
        })
        .catch((err) => {
          if (onError) {
            onError(err instanceof Error ? err : new Error(String(err)));
          } else {
            onUserResolved(null);
          }
        });
    });
  },

  /**
   * Firebase Authentication 이메일 + 비밀번호 로그인
   */
  async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    const validation = validateLoginInput(email, password);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    clearGuestSessionUser();
    let cred;
    try {
      cred = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
    } catch (err) {
      throw new Error(mapFirebaseAuthErrorKo(err));
    }

    return fetchOrBootstrapUserProfile(
      cred.user.uid,
      cred.user.email ?? email.trim().toLowerCase(),
      cred.user.displayName
    );
  },

  /**
   * Firebase Authentication 이메일/비밀번호 회원가입 + Firestore /users/{uid} 프로필 저장
   */
  async registerWithEmail(input: UserRegistrationInput): Promise<UserProfile> {
    const validation = validateRegistrationInput(input, true);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    clearGuestSessionUser();
    const trimmedEmail = input.email.trim().toLowerCase();
    const trimmedName = input.name.trim();
    const userGroup = classifyUserGroup(input.participationType);

    activeSignupInProgress = true;
    try {
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          input.password ?? ''
        );
      } catch (err) {
        throw new Error(mapFirebaseAuthErrorKo(err));
      }

      try {
        await updateProfile(cred.user, { displayName: trimmedName });
      } catch {
        // displayName 업데이트 실패는 치명적이지 않으므로 Firestore 저장 계속 진행
      }

      const uid = cred.user.uid;
      const path = `users/${uid}`;
      try {
        await setDoc(doc(db, 'users', uid), {
          uid,
          name: trimmedName,
          email: trimmedEmail,
          birthDate: input.birthDate,
          gender: input.gender,
          trainingExperience: input.trainingExperience,
          participationType: input.participationType,
          userGroup,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        // Firestore 프로필 생성이 거부된 경우 고아 Auth 계정이 로그인 상태로 남지 않도록 롤백 시도
        try {
          await deleteUser(cred.user);
        } catch {
          // 롤백 실패 시에도 아래에서 정확한 Firestore 단계 오류를 보고
        }
        handleFirestoreError(err, OperationType.CREATE, path, '회원가입 프로필 저장');
      }

      return {
        id: uid,
        name: trimmedName,
        email: trimmedEmail,
        birthDate: input.birthDate,
        age: calculateInternationalAge(input.birthDate),
        gender: input.gender,
        trainingExperience: input.trainingExperience,
        participationType: input.participationType,
        userGroup,
        isGuest: false,
        createdAt: new Date().toISOString(),
      };
    } finally {
      activeSignupInProgress = false;
    }
  },

  /**
   * 비회원(게스트) 즉시 시작 (sessionStorage만 사용, Firestore 미저장)
   */
  async loginAsGuest(input: GuestLoginInput): Promise<UserProfile> {
    const validation = validateGuestLoginInput(input);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    if (auth.currentUser) {
      await signOut(auth);
    }

    const guestUser: UserProfile = {
      id: `guest-${Date.now()}`,
      name: input.name.trim(),
      email: '',
      birthDate: input.birthDate,
      age: calculateInternationalAge(input.birthDate),
      gender: 'unspecified',
      trainingExperience: 'under3months',
      participationType:
        input.userGroup === 'athlete' ? 'athlete_training' : 'recreational',
      userGroup: input.userGroup,
      isGuest: true,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestUser));
    }

    return guestUser;
  },

  /**
   * 회원 프로필 정보 수정 및 참여 형태에 따른 일반인/운동인 자동 재분류
   */
  async updateProfile(
    userId: string,
    email: string,
    createdAt: string,
    input: UserProfileUpdateInput
  ): Promise<UserProfile> {
    const validation = validateProfileUpdateInput(input);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    const trimmedName = input.name.trim();
    const userGroup = classifyUserGroup(input.participationType);
    const path = `users/${userId}`;

    try {
      await updateDoc(doc(db, 'users', userId), {
        name: trimmedName,
        birthDate: input.birthDate,
        gender: input.gender,
        trainingExperience: input.trainingExperience,
        participationType: input.participationType,
        userGroup,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path, '회원 프로필 수정');
    }

    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        await updateProfile(auth.currentUser, { displayName: trimmedName });
      } catch {
        // 무시 가능
      }
    }

    return {
      id: userId,
      name: trimmedName,
      email,
      birthDate: input.birthDate,
      age: calculateInternationalAge(input.birthDate),
      gender: input.gender,
      trainingExperience: input.trainingExperience,
      participationType: input.participationType,
      userGroup,
      isGuest: false,
      createdAt,
    };
  },

  /**
   * 로그아웃 (Firebase Auth Sign-Out + 비회원 세션 초기화)
   */
  async logout(): Promise<void> {
    clearGuestSessionUser();
    if (auth.currentUser) {
      await signOut(auth);
    }
  },
};
