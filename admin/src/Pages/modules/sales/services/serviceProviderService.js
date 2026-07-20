// admin/src/Pages/modules/sales/services/serviceProviderService.js
import { request } from '../../../../Components/services/api';

export const listServiceProviders = async () => {
  const { data } = await request('/service-providers');
  return data.providers;
};