/**
 * [파일 목적] 영상 파일 검증(15초 제한) 및 브라우저 로컬 미리보기 관리 서비스
 * [책임]
 *   - 업로드된 동영상의 실제 재생 길이(duration)를 확인하여 최대 15초 이하만 허용합니다.
 *   - 브라우저 로컬 미리보기 URL(URL.createObjectURL)과 해상도/길이 메타데이터를 생성합니다.
 * [주의] 영상 원본 파일은 외부 서버로 전송하거나 데이터베이스에 저장하지 않습니다.
 *        실제 영상 기반 MCV 계산은 mediapipeMcv.ts의 캘리브레이션 + AI 자세 추정 엔진이 담당합니다.
 */

import type { VideoPreviewMeta } from '../types/domain';

/** 촬영 기준 최대 허용 영상 길이 (초) */
export const MAX_VIDEO_DURATION_SEC = 15;

export interface VideoAnalysisService {
  createValidatedVideoPreview(
    slotIndex: number,
    file: File
  ): Promise<VideoPreviewMeta>;
  revokeLocalVideoPreview(meta: VideoPreviewMeta | null): void;
}

/**
 * [기능] 브라우저 <video> 메타데이터 로드를 통해 영상 길이(초)와 해상도(가로/세로)를 읽습니다.
 * [오류] 15초를 초과하거나 브라우저에서 디코딩할 수 없는 형식이면 Object URL을 즉시 해제하고 예외를 던집니다.
 */
function readVideoMetadata(objectUrl: string): Promise<{
  durationSec: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = '';
    };

    video.onloadedmetadata = () => {
      const durationSec = video.duration;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      cleanup();

      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        reject(
          new Error(
            '영상 길이 정보를 확인할 수 없는 파일입니다. MP4 또는 WebM 형식을 권장합니다.'
          )
        );
        return;
      }

      // 최대 15초(약간의 인코딩 오차 0.1초 허용) 초과 시 업로드 차단
      if (durationSec > MAX_VIDEO_DURATION_SEC + 0.1) {
        reject(
          new Error(
            `첨부 영상은 ${MAX_VIDEO_DURATION_SEC}초 이하만 업로드할 수 있습니다. (선택한 영상 길이: ${durationSec.toFixed(
              1
            )}초)`
          )
        );
        return;
      }

      resolve({ durationSec, width, height });
    };

    video.onerror = () => {
      cleanup();
      reject(
        new Error(
          '브라우저에서 재생할 수 없는 동영상 형식입니다. MP4(H.264) 또는 WebM 파일을 사용해 주세요.'
        )
      );
    };

    video.src = objectUrl;
  });
}

/**
 * [구현체] 영상 15초 검증 및 로컬 미리보기 서비스
 */
export const videoAnalysisService: VideoAnalysisService = {
  /**
   * [기능] 파일의 길이(<= 15초) 및 해상도를 검증한 뒤 미리보기용 VideoPreviewMeta를 반환합니다.
   */
  async createValidatedVideoPreview(
    slotIndex: number,
    file: File
  ): Promise<VideoPreviewMeta> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const { durationSec, width, height } = await readVideoMetadata(objectUrl);
      return {
        slotIndex,
        fileName: file.name,
        fileSizeBytes: file.size,
        durationSec,
        width,
        height,
        objectUrl,
      };
    } catch (err) {
      // 검증 실패 시 생성된 Object URL을 즉시 해제하여 메모리 누수 방지
      URL.revokeObjectURL(objectUrl);
      throw err;
    }
  },

  /**
   * [기능] 생성된 브라우저 Object URL 메모리를 해제합니다.
   */
  revokeLocalVideoPreview(meta: VideoPreviewMeta | null): void {
    if (meta?.objectUrl) {
      URL.revokeObjectURL(meta.objectUrl);
    }
  },
};
