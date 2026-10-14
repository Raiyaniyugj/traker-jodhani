import { POST as handleOrdersCreate } from '../../orders-create/route';

export async function POST(req: any) {
  return handleOrdersCreate(req);
}
