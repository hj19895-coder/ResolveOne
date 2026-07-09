import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,

  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    if (err.response?.status === 403) {
      window.dispatchEvent(new CustomEvent("forbidden", {
        detail: err.response.data?.message ?? "You don't have permission to perform this action",
      }));
    }
    return Promise.reject(err);
  }
);

export default api;
