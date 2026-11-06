import prisma from "../prisma";
import { Prisma, User } from "@prisma/client";

export const UserModel = {
  findByEmail: (email: string) =>
    prisma.user.findFirst({
      where: {
        email: { equals: email.trim().toLowerCase(), mode: "insensitive" },
      },
    }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),

  findAll: () =>
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
      },
    }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),

  updatePermissions: (id: string, permissions: string[]) =>
    prisma.user.update({
      where: { id },
      data: { permissions },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
      },
    }),

  deactivate: (id: string) =>
    prisma.user.update({ where: { id }, data: { isActive: false } }),
};

export type SafeUser = Omit<User, "passwordHash">;
