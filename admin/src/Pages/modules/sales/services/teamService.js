// admin/src/Pages/modules/sales/services/teamService.js (NEW FILE)
import { request } from '../../../../Components/services/api';

export const listKams = async () => {
  const { data } = await request('/users/kams');
  return data.kams;
};