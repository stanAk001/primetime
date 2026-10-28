import axios from 'axios';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  withCredentials: true,
});

// Pull the most specific message out of the backend's error shapes.
export const getApiError = (err) =>
  err?.response?.data?.details?.[0]?.message ||
  err?.response?.data?.error ||
  err?.message ||
  'Something went wrong';
