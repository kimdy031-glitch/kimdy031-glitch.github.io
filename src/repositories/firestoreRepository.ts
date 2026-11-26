/**
 * [파일 목적] VELOMAX 회원 측정 기록 Cloud Firestore 저장소 (v1)
 * [책임]
 *   - /users/{userId}/measurements/{measurementId} 서브컬렉션 CRUD 및 실시간 구독
 *   - firestore.rules 및 firebase-blueprint.json 스키마에 맞춘 페이로드 정제 및 길이 제한 적용
 *   - 모든 읽기/쓰기/삭제/스냅샷 오류를 handleFirestoreError로 구조화 보고
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { MeasurementRecord, VelocityOrigin, VelocitySource } from '../types/domain';
import { MAX_MEASUREMENT_SETS } from '../utils/validation';

function mapDocToMeasurementRecord(
  docSnap: QueryDocumentSnapshot
): MeasurementRecord {
  const data = docSnap.data() as Record<string, unknown>;
  const velocitySource: VelocitySource =
    data.velocitySource === 'mediapipe' ? 'mediapipe' : 'manual';

  const mvtRaw = (data.mvt ?? {}) as Record<string, unknown>;
  const regRaw = (data.regression ?? {}) as Record<string, unknown>;
  const pointsRaw = Array.isArray(data.points) ? data.points : [];

  return {
    id: typeof data.id === 'string' ? data.id : docSnap.id,
    userId: typeof data.userId === 'string' ? data.userId : '',
    exercise: data.exercise === 'deadlift' ? 'deadlift' : 'squat',
    userGroupSnapshot:
      data.userGroupSnapshot === 'athlete' ? 'athlete' : 'general',
    measuredAt:
      typeof data.measuredAt === 'string'
        ? data.measuredAt
        : new Date().toISOString(),
    velocitySource,
    velocityOrigin: (data.velocityOrigin as VelocityOrigin) ?? 'unknown',
    videoAnalysisPerformed: Boolean(data.videoAnalysisPerformed),
    attachedVideoNames: Array.isArray(data.attachedVideoNames)
      ? data.attachedVideoNames.filter((n): n is string => typeof n === 'string')
      : [],
    points: pointsRaw.map((pt) => {
      const p = pt as Record<string, unknown>;
      return {
        loadKg: Number(p.loadKg) || 0,
        mcvMs: Number(p.mcvMs) || 0,
      };
    }),
    regression: {
      slope: Number(regRaw.slope) || 0,
      intercept: Number(regRaw.intercept) || 0,
      r2: Number(regRaw.r2) || 0,
    },
    mvt: {
      valueMs: Number(mvtRaw.valueMs) || 0.35,
      source: 'STANDARD_V1',
    },
    e1rmKg: Number(data.e1rmKg) || 0,
    isHighExtrapolation: Boolean(data.isHighExtrapolation),
    analysisEngineVersion:
      typeof data.analysisEngineVersion === 'string'
        ? data.analysisEngineVersion
        : 'v1.0.0',
  };
}

function sortMeasurementsNewestFirst(
  records: MeasurementRecord[]
): MeasurementRecord[] {
  return [...records].sort(
    (a, b) =>
      new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
  );
}

export const firestoreMeasurementRepository = {
  /**
   * [기능] 특정 회원의 측정 기록 실시간 구독 (최신 측정일 순 정렬)
   */
  subscribeByUser(
    userId: string,
    onData: (records: MeasurementRecord[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const colPath = `users/${userId}/measurements`;
    const q = query(
      collection(db, 'users', userId, 'measurements'),
      where('userId', '==', userId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(mapDocToMeasurementRecord);
        onData(sortMeasurementsNewestFirst(list));
      },
      (error) => {
        try {
          handleFirestoreError(
            error,
            OperationType.LIST,
            colPath,
            '측정 기록 실시간 구독'
          );
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  },

  /**
   * [기능] 특정 회원의 측정 기록 일괄 조회
   */
  async getAllByUser(userId: string): Promise<MeasurementRecord[]> {
    const colPath = `users/${userId}/measurements`;
    const q = query(
      collection(db, 'users', userId, 'measurements'),
      where('userId', '==', userId)
    );

    try {
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(mapDocToMeasurementRecord);
      return sortMeasurementsNewestFirst(list);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        colPath,
        '측정 기록 목록 조회'
      );
    }
  },

  /**
   * [기능] 단일 측정 기록 저장 (스키마 제약·문자열 길이·배열 크기 정제 포함)
   */
  async save(userId: string, record: MeasurementRecord): Promise<void> {
    const docPath = `users/${userId}/measurements/${record.id}`;
    const safeVideoNames = (record.attachedVideoNames ?? [])
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
      .slice(0, MAX_MEASUREMENT_SETS)
      .map((name) => name.slice(0, 200));

    const safePoints = record.points.slice(0, MAX_MEASUREMENT_SETS).map((pt) => ({
      loadKg: Number(pt.loadKg),
      mcvMs: Number(pt.mcvMs),
    }));

    const payload = {
      id: record.id.slice(0, 128),
      userId,
      exercise: record.exercise,
      userGroupSnapshot: record.userGroupSnapshot,
      measuredAt: record.measuredAt.slice(0, 40),
      velocitySource: record.velocitySource,
      velocityOrigin: record.velocityOrigin ?? 'unknown',
      videoAnalysisPerformed: Boolean(record.videoAnalysisPerformed),
      attachedVideoNames: safeVideoNames,
      points: safePoints,
      regression: {
        slope: Number(record.regression.slope),
        intercept: Number(record.regression.intercept),
        r2: Number(record.regression.r2),
      },
      mvt: {
        valueMs: Number(record.mvt.valueMs),
        source: 'STANDARD_V1' as const,
      },
      e1rmKg: Number(record.e1rmKg),
      isHighExtrapolation: Boolean(record.isHighExtrapolation),
      analysisEngineVersion: record.analysisEngineVersion.slice(0, 32),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', userId, 'measurements', record.id), payload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        docPath,
        '측정 기록 저장'
      );
    }
  },

  /**
   * [기능] 특정 측정 기록 1건 삭제
   */
  async delete(userId: string, measurementId: string): Promise<void> {
    const docPath = `users/${userId}/measurements/${measurementId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'measurements', measurementId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        docPath,
        '측정 기록 단건 삭제'
      );
    }
  },

  /**
   * [기능] 회원의 모든 측정 기록 일괄 삭제
   */
  async deleteAllByUser(userId: string): Promise<void> {
    const colPath = `users/${userId}/measurements`;
    const q = query(
      collection(db, 'users', userId, 'measurements'),
      where('userId', '==', userId)
    );

    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        colPath,
        '전체 삭제 대상 조회'
      );
    }

    if (snapshot.empty) return;

    try {
      const batchSize = 400;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        colPath,
        '측정 기록 일괄 삭제'
      );
    }
  },
};
