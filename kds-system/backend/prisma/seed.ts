import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('REDACTED_PASSWORD', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: adminPassword,
    },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', admin.email);

  // Crear configuración general
  const config = await prisma.generalConfig.upsert({
    where: { id: 'general' },
    update: {},
    create: {
      id: 'general',
      pollingInterval: 2000,
      orderLifetime: 4,
      logRetentionDays: 5,
    },
  });
  console.log('General config created');

  // Crear cola LINEAS
  const queueLineas = await prisma.queue.upsert({
    where: { name: 'LINEAS' },
    update: {},
    create: {
      name: 'LINEAS',
      description: 'Cola principal para productos de línea (pollo)',
      distribution: 'DISTRIBUTED',
      channels: {
        create: [
          { channel: 'Kiosko-Efectivo', color: '#0299d0', priority: 1 },
          { channel: 'Kiosko-Tarjeta', color: '#d0021b', priority: 1 },
          { channel: 'Local', color: '#7ed321', priority: 2 },
          { channel: 'Pick-up-Tarjeta', color: '#d0021b', priority: 1 },
          { channel: 'Llevar', color: '#000000', priority: 2 },
          { channel: 'Pickup-Efectivo', color: '#4a9882', priority: 1 },
          { channel: 'PedidosYa', color: '#d0021b', priority: 3 },
          { channel: 'RAPPI', color: '#d0021b', priority: 3 },
          { channel: 'RAPPI-TURBO', color: '#ff8000', priority: 4 },
          { channel: 'APP', color: '#bd10e0', priority: 2 },
          { channel: 'CALLCENTER', color: '#ec728a', priority: 2 },
          { channel: 'Drive', color: '#d0021b', priority: 2 },
        ],
      },
    },
  });
  console.log('Queue LINEAS created:', queueLineas.id);

  // Crear cola SANDUCHE
  const queueSanduche = await prisma.queue.upsert({
    where: { name: 'SANDUCHE' },
    update: {},
    create: {
      name: 'SANDUCHE',
      description: 'Cola para sánduches, twisters y rusters',
      distribution: 'DISTRIBUTED',
      channels: {
        create: [
          { channel: 'Kiosko-Efectivo', color: '#0299d0', priority: 1 },
          { channel: 'Kiosko-Tarjeta', color: '#d0021b', priority: 1 },
          { channel: 'Local', color: '#7ed321', priority: 2 },
          { channel: 'Llevar', color: '#000000', priority: 2 },
        ],
      },
      filters: {
        create: [
          { pattern: 'S.', suppress: false },
          { pattern: 'sanduche', suppress: false },
          { pattern: 'sandwich', suppress: false },
          { pattern: 'twister', suppress: false },
          { pattern: 'ruster', suppress: false },
        ],
      },
    },
  });
  console.log('Queue SANDUCHE created:', queueSanduche.id);

  // Crear Pantalla 1 (Pollo)
  const screen1 = await prisma.screen.upsert({
    where: { ip: '10.101.27.59' },
    update: {},
    create: {
      name: 'Pantalla1',
      ip: '10.101.27.59',
      queueId: queueLineas.id,
      status: 'OFFLINE',
      appearance: {
        create: {
          fontSize: '20px',
          fontFamily: 'Arimo-Medium',
          columnsPerScreen: 4,
          columnSize: '260px',
          footerHeight: '72px',
          ordersDisplay: 'COLUMNS',
          theme: 'DARK',
          screenName: 'POLLO-01',
          screenSplit: false,
          showCounters: false,
          cardColors: {
            create: [
              { color: '#98c530', minutes: '01:00', order: 1, isFullBackground: false },
              { color: '#fddf58', minutes: '02:00', order: 2, isFullBackground: false },
              { color: '#e75646', minutes: '03:00', order: 3, isFullBackground: false },
              { color: '#e75646', minutes: '04:00', order: 4, isFullBackground: false },
            ],
          },
        },
      },
      preference: {
        create: {
          showClientData: true,
          showName: true,
          showIdentifier: true,
          identifierMessage: 'Orden',
          showPagination: true,
          sourceBoxActive: true,
          sourceBoxMessage: 'KDS',
        },
      },
      keyboard: {
        create: {
          finishFirstOrder: 'h',
          finishSecondOrder: '3',
          finishThirdOrder: '1',
          finishFourthOrder: 'f',
          nextPage: 'i',
          previousPage: 'g',
          combos: JSON.stringify([
            { keys: ['i', 'g'], holdTime: 3000, action: 'togglePower', enabled: true },
          ]),
        },
      },
      printer: {
        create: {
          name: 'lineadomi',
          ip: '10.101.27.66',
          port: 9100,
          enabled: true,
        },
      },
    },
  });
  console.log('Screen 1 created:', screen1.name);

  // Crear Pantalla 2 (Pollo)
  const screen2 = await prisma.screen.upsert({
    where: { ip: '10.101.27.58' },
    update: {},
    create: {
      name: 'Pantalla2',
      ip: '10.101.27.58',
      queueId: queueLineas.id,
      status: 'OFFLINE',
      appearance: {
        create: {
          fontSize: '20px',
          fontFamily: 'Arimo-Medium',
          columnsPerScreen: 4,
          columnSize: '260px',
          footerHeight: '72px',
          ordersDisplay: 'COLUMNS',
          theme: 'DARK',
          screenName: 'POLLO-02',
          screenSplit: false,
          showCounters: false,
          cardColors: {
            create: [
              { color: '#98c530', minutes: '01:00', order: 1, isFullBackground: false },
              { color: '#fddf58', minutes: '02:00', order: 2, isFullBackground: false },
              { color: '#e75646', minutes: '03:00', order: 3, isFullBackground: false },
              { color: '#e75646', minutes: '04:00', order: 4, isFullBackground: false },
            ],
          },
        },
      },
      preference: {
        create: {
          showClientData: true,
          showName: true,
          showIdentifier: true,
          identifierMessage: 'Orden',
          showPagination: true,
          sourceBoxActive: true,
          sourceBoxMessage: 'KDS',
        },
      },
      keyboard: {
        create: {
          finishFirstOrder: 'h',
          finishSecondOrder: '3',
          finishThirdOrder: '1',
          finishFourthOrder: 'f',
          nextPage: 'i',
          previousPage: 'g',
          combos: JSON.stringify([
            { keys: ['i', 'g'], holdTime: 3000, action: 'togglePower', enabled: true },
          ]),
        },
      },
      printer: {
        create: {
          name: 'linea',
          ip: '10.101.27.67',
          port: 9100,
          enabled: true,
        },
      },
    },
  });
  console.log('Screen 2 created:', screen2.name);

  // Crear Pantalla 3 (Sánduches)
  const screen3 = await prisma.screen.upsert({
    where: { ip: '10.101.27.60' },
    update: {},
    create: {
      name: 'Pantalla3',
      ip: '10.101.27.60',
      queueId: queueSanduche.id,
      status: 'OFFLINE',
      appearance: {
        create: {
          fontSize: '20px',
          fontFamily: 'Arimo-Medium',
          columnsPerScreen: 4,
          columnSize: '260px',
          footerHeight: '72px',
          ordersDisplay: 'COLUMNS',
          theme: 'DARK',
          screenName: 'SANDUCHE',
          screenSplit: false,
          showCounters: false,
          cardColors: {
            create: [
              { color: '#98c530', minutes: '01:00', order: 1, isFullBackground: false },
              { color: '#fddf58', minutes: '02:00', order: 2, isFullBackground: false },
              { color: '#e75646', minutes: '03:00', order: 3, isFullBackground: false },
              { color: '#e75646', minutes: '04:00', order: 4, isFullBackground: false },
            ],
          },
        },
      },
      preference: {
        create: {
          showClientData: true,
          showName: true,
          showIdentifier: true,
          identifierMessage: 'Orden',
          showPagination: true,
          sourceBoxActive: true,
          sourceBoxMessage: 'KDS',
        },
      },
      keyboard: {
        create: {
          finishFirstOrder: 'h',
          finishSecondOrder: '3',
          finishThirdOrder: '1',
          finishFourthOrder: 'f',
          nextPage: 'i',
          previousPage: 'g',
          combos: JSON.stringify([
            { keys: ['i', 'g'], holdTime: 3000, action: 'togglePower', enabled: true },
          ]),
        },
      },
    },
  });
  console.log('Screen 3 created:', screen3.name);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
