import {
  adminOrderListQuerySchema,
  adminOrderListResponseSchema,
  adminOrderSchema,
  changeOrderStatusSchema,
  orderParamsSchema,
} from '@nisha/contracts';
import type { AdminOrder } from '@nisha/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Database } from '../../database/client';
import { signedInUser } from '../../plugins/auth';
import { AppError } from '../../shared/errors';
import { allowedStatuses } from '../orders/order-status';
import { findOrderRow, findOrdersForAdmin, loadOrder } from '../orders/orders.repository';
import type { OrderRow } from '../orders/orders.repository';
import { cancelIfExpired, changeOrderStatus } from '../orders/orders.service';

async function adminOrder(db: Database, row: OrderRow): Promise<AdminOrder> {
  return {
    ...(await loadOrder(db, row)),
    allowedStatuses: allowedStatuses(row.status, row.deliveryMethod),
  };
}

export const adminOrdersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/orders',
    {
      schema: {
        querystring: adminOrderListQuerySchema,
        response: { 200: adminOrderListResponseSchema },
      },
    },
    async (request) => {
      const { rows, total } = await findOrdersForAdmin(app.db, request.query);
      return {
        total,
        items: rows.map((row) => ({
          id: row.id,
          number: row.number,
          status: row.status,
          paymentStatus: row.paymentStatus,
          createdAt: row.createdAt.toISOString(),
          contactName: row.contactName,
          contactEmail: row.contactEmail,
          deliveryMethod: row.deliveryMethod,
          totalKopecks: row.totalKopecks,
        })),
      };
    },
  );

  app.get(
    '/orders/:id',
    { schema: { params: orderParamsSchema, response: { 200: adminOrderSchema } } },
    async (request) => {
      await cancelIfExpired(app.db, request.params.id);
      const row = await findOrderRow(app.db, request.params.id);
      if (!row) throw new AppError('NOT_FOUND', 'Заказ не найден');
      return adminOrder(app.db, row);
    },
  );

  app.patch(
    '/orders/:id/status',
    {
      schema: {
        params: orderParamsSchema,
        body: changeOrderStatusSchema,
        response: { 200: adminOrderSchema },
      },
    },
    async (request) => {
      const row = await changeOrderStatus(
        app.db,
        request.params.id,
        request.body,
        signedInUser(request),
      );
      return adminOrder(app.db, row);
    },
  );
};
