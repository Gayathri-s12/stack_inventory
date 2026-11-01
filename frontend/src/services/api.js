import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api',withCredentials:true,headers:{'Content-Type':'application/json'}});
api.interceptors.response.use(r=>r,e=>{const message=e.response?.data?.message||e.message||'Request failed';return Promise.reject(new Error(message));});
export default api;
