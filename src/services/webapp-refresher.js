import axios from 'axios';

const SECRET = process.env.WEBAPP_REVALIDATION_SECRET_TOKEN;
const BASE_URL = process.env.WEBAPP_BASE_URL;

export const refreshWebapp = () => {
  const instance = axios.create({ baseURL: BASE_URL });

  instance.get(`/api/revalidate?secret=${SECRET}`);
  instance.get(`/api/revalidate?secret=${SECRET}&path=operations`);
  instance.get(`/api/revalidate?secret=${SECRET}&path=projects`);
};
