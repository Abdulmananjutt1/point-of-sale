import prisma from "../prisma";
import { Prisma } from "@prisma/client";

export const SettingsModel = {
  get: () =>
    prisma.appSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    }),

  update: (data: Prisma.AppSettingsUpdateInput) =>
    prisma.appSettings.update({ where: { id: 1 }, data }),
};
