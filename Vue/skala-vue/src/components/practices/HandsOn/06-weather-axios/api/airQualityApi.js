/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 프로그램 설명: Open-Meteo에서 현재 미세먼지와 대기질 지수를 요청
 */
import axios from 'axios'

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

export const fetchCurrentAirQuality = async (latitude, longitude) => {
  const response = await axios.get(AIR_QUALITY_URL, {
    params: {
      latitude,
      longitude,
      current: 'pm10,pm2_5,us_aqi',
      timezone: 'Asia/Seoul',
    },
  })

  return response.data
}
