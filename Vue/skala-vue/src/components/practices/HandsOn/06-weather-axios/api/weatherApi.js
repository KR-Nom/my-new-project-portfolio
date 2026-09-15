/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: 현재 날씨와 3시간 간격 예보 요청 함수를 분리
 * 프로그램 설명: 위도와 경도를 이용해 OpenWeatherMap 날씨 데이터를 요청
 */
import axios from 'axios'

const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

const createWeatherParams = (latitude, longitude) => ({
  lat: latitude,
  lon: longitude,
  appid: API_KEY,
  units: 'metric',
  lang: 'kr',
})

export const fetchCurrentWeather = async (latitude, longitude) => {
  const response = await axios.get(WEATHER_URL, {
    params: createWeatherParams(latitude, longitude),
  })

  return response.data
}

export const fetchWeatherForecast = async (latitude, longitude) => {
  const response = await axios.get(FORECAST_URL, {
    params: createWeatherParams(latitude, longitude),
  })

  return response.data
}
