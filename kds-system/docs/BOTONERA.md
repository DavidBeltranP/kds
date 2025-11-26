# BOTONERA FÍSICA KDS

## 1. Introducción

La botonera física es un dispositivo de entrada que permite a los operadores de cocina interactuar con el KDS sin necesidad de tocar la pantalla. Envía caracteres específicos que el sistema interpreta como acciones.

## 2. Hardware

### 2.1 Teclas Físicas

La botonera estándar tiene 6 botones que envían los siguientes caracteres:

```
┌─────────────────────────────────────────┐
│              BOTONERA KDS               │
│                                         │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │
│   │  1  │  │  3  │  │  i  │  │  h  │   │
│   └─────┘  └─────┘  └─────┘  └─────┘   │
│                                         │
│        ┌─────┐           ┌─────┐        │
│        │  g  │           │  f  │        │
│        └─────┘           └─────┘        │
│                                         │
└─────────────────────────────────────────┘
```

### 2.2 Caracteres Enviados

| Tecla | Carácter | Código ASCII |
|-------|----------|--------------|
| 1 | '1' | 49 |
| 3 | '3' | 51 |
| i | 'i' | 105 |
| h | 'h' | 104 |
| g | 'g' | 103 |
| f | 'f' | 102 |

## 3. Mapeo de Acciones

### 3.1 Acciones Predeterminadas

| Tecla | Acción | Descripción |
|-------|--------|-------------|
| `h` | finishFirstOrder | Finaliza la primera orden visible |
| `3` | finishSecondOrder | Finaliza la segunda orden visible |
| `1` | finishThirdOrder | Finaliza la tercera orden visible |
| `f` | finishFourthOrder | Finaliza la cuarta orden visible |
| `i` | nextPage | Avanza a la siguiente página |
| `g` | previousPage | Retrocede a la página anterior |

### 3.2 Combinaciones Especiales

| Combinación | Tiempo | Acción | Descripción |
|-------------|--------|--------|-------------|
| `i + g` | 3 seg | togglePower | Activa/desactiva modo STANDBY |
| `h + f` | 5 seg | emergencyReset | Reinicia la pantalla |
| `1 + 3` | 3 seg | showConfig | Muestra información de configuración |

## 4. ButtonController

### 4.1 Arquitectura

```typescript
// buttonController.ts

interface ButtonAction {
  key: string;
  action: string;
  handler: () => void;
}

interface ComboAction {
  keys: string[];
  holdTime: number;  // ms
  action: string;
  handler: () => void;
}

class ButtonController {
  private pressedKeys: Set<string> = new Set();
  private keyTimestamps: Map<string, number> = new Map();
  private comboTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastActionTime: number = 0;
  private debounceTime: number = 200; // ms

  constructor(
    private actions: ButtonAction[],
    private combos: ComboAction[],
    private onLog: (message: string) => void
  ) {
    this.setupListeners();
  }

  private setupListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Evitar repetición por mantener presionado
    if (this.pressedKeys.has(key)) return;

    this.pressedKeys.add(key);
    this.keyTimestamps.set(key, Date.now());

    this.onLog(`[BOTONERA] Key DOWN: ${key}`);

    // Verificar combos
    this.checkCombos();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    // Debounce
    const now = Date.now();
    if (now - this.lastActionTime < this.debounceTime) {
      this.pressedKeys.delete(key);
      return;
    }

    // Si no hay combo activo, ejecutar acción simple
    if (!this.hasActiveCombo()) {
      this.executeSimpleAction(key);
    }

    this.pressedKeys.delete(key);
    this.keyTimestamps.delete(key);
    this.cancelComboTimers();

    this.onLog(`[BOTONERA] Key UP: ${key}`);
  }

  private checkCombos(): void {
    for (const combo of this.combos) {
      const allPressed = combo.keys.every(k => this.pressedKeys.has(k));

      if (allPressed) {
        const comboId = combo.keys.join('+');

        // Cancelar timer existente
        if (this.comboTimers.has(comboId)) {
          clearTimeout(this.comboTimers.get(comboId)!);
        }

        // Iniciar nuevo timer
        const timer = setTimeout(() => {
          this.executeCombo(combo);
        }, combo.holdTime);

        this.comboTimers.set(comboId, timer);
        this.onLog(`[BOTONERA] Combo detectado: ${comboId}, esperando ${combo.holdTime}ms`);
      }
    }
  }

  private executeSimpleAction(key: string): void {
    const action = this.actions.find(a => a.key === key);
    if (action) {
      this.lastActionTime = Date.now();
      this.onLog(`[BOTONERA] Ejecutando: ${action.action}`);
      action.handler();
    }
  }

  private executeCombo(combo: ComboAction): void {
    this.lastActionTime = Date.now();
    this.onLog(`[BOTONERA] Ejecutando combo: ${combo.action}`);
    combo.handler();
  }

  private hasActiveCombo(): boolean {
    return this.comboTimers.size > 0;
  }

  private cancelComboTimers(): void {
    this.comboTimers.forEach(timer => clearTimeout(timer));
    this.comboTimers.clear();
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.cancelComboTimers();
  }
}
```

### 4.2 Configuración

```typescript
// Ejemplo de configuración
const buttonConfig: ButtonConfig = {
  actions: [
    { key: 'h', action: 'finishFirstOrder' },
    { key: '3', action: 'finishSecondOrder' },
    { key: '1', action: 'finishThirdOrder' },
    { key: 'f', action: 'finishFourthOrder' },
    { key: 'i', action: 'nextPage' },
    { key: 'g', action: 'previousPage' }
  ],
  combos: [
    { keys: ['i', 'g'], holdTime: 3000, action: 'togglePower' },
    { keys: ['h', 'f'], holdTime: 5000, action: 'emergencyReset' },
    { keys: ['1', '3'], holdTime: 3000, action: 'showConfig' }
  ],
  debounceTime: 200
};
```

## 5. Integración con el Sistema

### 5.1 Hook useKeyboard

```typescript
// hooks/useKeyboard.ts

import { useEffect, useCallback } from 'react';
import { useOrderStore } from '../store/orderStore';
import { useScreenStore } from '../store/screenStore';
import { ButtonController } from '../utils/buttonController';

export function useKeyboard() {
  const { finishOrder, undoFinish, setPage } = useOrderStore();
  const { toggleStandby, isStandby } = useScreenStore();

  const handleAction = useCallback((action: string) => {
    // Si está en standby, solo responder a togglePower
    if (isStandby && action !== 'togglePower') {
      return;
    }

    switch (action) {
      case 'finishFirstOrder':
        finishOrder(0);
        break;
      case 'finishSecondOrder':
        finishOrder(1);
        break;
      case 'finishThirdOrder':
        finishOrder(2);
        break;
      case 'finishFourthOrder':
        finishOrder(3);
        break;
      case 'nextPage':
        setPage('next');
        break;
      case 'previousPage':
        setPage('prev');
        break;
      case 'togglePower':
        toggleStandby();
        break;
      case 'undo':
        undoFinish();
        break;
    }
  }, [finishOrder, undoFinish, setPage, toggleStandby, isStandby]);

  useEffect(() => {
    const controller = new ButtonController(
      buttonConfig.actions.map(a => ({
        ...a,
        handler: () => handleAction(a.action)
      })),
      buttonConfig.combos.map(c => ({
        ...c,
        handler: () => handleAction(c.action)
      })),
      console.log
    );

    return () => controller.destroy();
  }, [handleAction]);
}
```

### 5.2 Comunicación con Backend

Cuando se ejecuta una acción importante, se notifica al backend:

```typescript
// Al activar/desactivar standby
socket.emit('screen:status', {
  screenId: config.screenId,
  status: isStandby ? 'STANDBY' : 'ONLINE',
  timestamp: Date.now()
});

// Al finalizar una orden
socket.emit('order:finish', {
  orderId: order.id,
  screenId: config.screenId,
  timestamp: Date.now()
});
```

## 6. Modo STANDBY

### 6.1 Activación

```typescript
// Combo: i + g por 3 segundos
{
  keys: ['i', 'g'],
  holdTime: 3000,
  action: 'togglePower',
  handler: () => {
    // 1. Cambiar estado local
    setStandby(true);

    // 2. Notificar al backend
    socket.emit('screen:status', {
      screenId,
      status: 'STANDBY'
    });

    // 3. Log
    logAction('STANDBY activado');
  }
}
```

### 6.2 Comportamiento en STANDBY

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      KDS - STANDBY                          │
│                                                             │
│                         ░░░░░░                              │
│                        ░░░░░░░░                             │
│                       ░░░░░░░░░░                            │
│                        ░░░░░░░░                             │
│                         ░░░░░░                              │
│                                                             │
│              Pantalla en modo de espera                     │
│                                                             │
│         Presione i + g por 3 segundos para activar          │
│                                                             │
│                                                             │
│                    Pantalla: POLLO-01                       │
│                    IP: 10.101.27.59                         │
│                    Cola: LINEAS                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Desactivación

```typescript
// Mismo combo: i + g por 3 segundos
{
  keys: ['i', 'g'],
  holdTime: 3000,
  action: 'togglePower',
  handler: () => {
    // 1. Cambiar estado local
    setStandby(false);

    // 2. Notificar al backend
    socket.emit('screen:status', {
      screenId,
      status: 'ONLINE'
    });

    // 3. Solicitar órdenes actuales
    socket.emit('screen:requestOrders', { screenId });

    // 4. Log
    logAction('STANDBY desactivado');
  }
}
```

## 7. Protección contra Activaciones Accidentales

### 7.1 Debounce

```typescript
class ButtonController {
  private debounceTime: number = 200; // ms
  private lastActionTime: number = 0;

  private shouldExecute(): boolean {
    const now = Date.now();
    if (now - this.lastActionTime < this.debounceTime) {
      return false;
    }
    this.lastActionTime = now;
    return true;
  }
}
```

### 7.2 Hold Time para Combos

Los combos requieren mantener las teclas presionadas por un tiempo mínimo:

| Combo | Hold Time | Razón |
|-------|-----------|-------|
| i + g (STANDBY) | 3000ms | Evitar apagado accidental |
| h + f (Reset) | 5000ms | Acción crítica |
| 1 + 3 (Config) | 3000ms | Acción administrativa |

### 7.3 Confirmación Visual

Para combos críticos, mostrar indicador visual:

```typescript
// Mostrar progreso del combo
const [comboProgress, setComboProgress] = useState(0);

useEffect(() => {
  if (comboPending) {
    const interval = setInterval(() => {
      setComboProgress(p => Math.min(p + 10, 100));
    }, holdTime / 10);

    return () => {
      clearInterval(interval);
      setComboProgress(0);
    };
  }
}, [comboPending]);
```

## 8. Logging

### 8.1 Eventos a Registrar

```typescript
interface ButtonLog {
  timestamp: Date;
  screenId: string;
  event: 'keydown' | 'keyup' | 'action' | 'combo';
  key?: string;
  action?: string;
  success: boolean;
  error?: string;
}
```

### 8.2 Ejemplo de Logs

```
2025-11-25 10:30:00.123 [BOTONERA] Key DOWN: h
2025-11-25 10:30:00.234 [BOTONERA] Key UP: h
2025-11-25 10:30:00.234 [BOTONERA] Ejecutando: finishFirstOrder
2025-11-25 10:30:00.250 [BOTONERA] Acción completada: finishFirstOrder

2025-11-25 10:31:00.000 [BOTONERA] Key DOWN: i
2025-11-25 10:31:00.100 [BOTONERA] Key DOWN: g
2025-11-25 10:31:00.100 [BOTONERA] Combo detectado: i+g, esperando 3000ms
2025-11-25 10:31:03.100 [BOTONERA] Ejecutando combo: togglePower
2025-11-25 10:31:03.150 [BOTONERA] STANDBY activado
```

## 9. Configuración desde Backoffice

### 9.1 Interfaz de Configuración

```typescript
interface KeyboardConfig {
  screenId: string;
  actions: {
    key: string;
    action: string;
    enabled: boolean;
  }[];
  combos: {
    keys: string[];
    holdTime: number;
    action: string;
    enabled: boolean;
  }[];
  debounceTime: number;
}
```

### 9.2 API Endpoints

```
GET  /api/screens/:screenId/keyboard-config
PUT  /api/screens/:screenId/keyboard-config
POST /api/screens/:screenId/keyboard-config/reset
```

### 9.3 Formulario en Backoffice

```tsx
// Backoffice - Configuración de Botonera
<Form>
  <Card title="Acciones Simples">
    {actions.map(action => (
      <Row key={action.key}>
        <Col span={4}>
          <Input value={action.key} disabled />
        </Col>
        <Col span={12}>
          <Select value={action.action}>
            <Option value="finishFirstOrder">Finalizar 1ra orden</Option>
            <Option value="finishSecondOrder">Finalizar 2da orden</Option>
            <Option value="nextPage">Siguiente página</Option>
            <Option value="previousPage">Página anterior</Option>
            {/* ... más opciones */}
          </Select>
        </Col>
        <Col span={4}>
          <Switch checked={action.enabled} />
        </Col>
      </Row>
    ))}
  </Card>

  <Card title="Combinaciones">
    {combos.map(combo => (
      <Row key={combo.keys.join('+')}>
        <Col span={6}>{combo.keys.join(' + ')}</Col>
        <Col span={6}>
          <InputNumber
            value={combo.holdTime}
            suffix="ms"
            min={1000}
            max={10000}
          />
        </Col>
        <Col span={8}>
          <Select value={combo.action}>
            <Option value="togglePower">Encender/Apagar</Option>
            <Option value="emergencyReset">Reset de emergencia</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Switch checked={combo.enabled} />
        </Col>
      </Row>
    ))}
  </Card>
</Form>
```

## 10. Testing

### 10.1 Test Manual

```bash
# Verificar que la botonera envía los caracteres correctos
# En la consola del navegador:
document.addEventListener('keydown', e => console.log('Key:', e.key));
```

### 10.2 Test Automatizado

```typescript
describe('ButtonController', () => {
  it('should execute simple action on key press', () => {
    const handler = jest.fn();
    const controller = new ButtonController(
      [{ key: 'h', action: 'test', handler }],
      [],
      () => {}
    );

    fireEvent.keyDown(document, { key: 'h' });
    fireEvent.keyUp(document, { key: 'h' });

    expect(handler).toHaveBeenCalled();
  });

  it('should execute combo after hold time', async () => {
    const handler = jest.fn();
    const controller = new ButtonController(
      [],
      [{ keys: ['i', 'g'], holdTime: 1000, action: 'test', handler }],
      () => {}
    );

    fireEvent.keyDown(document, { key: 'i' });
    fireEvent.keyDown(document, { key: 'g' });

    await new Promise(r => setTimeout(r, 1100));

    expect(handler).toHaveBeenCalled();
  });

  it('should not execute combo if released early', async () => {
    const handler = jest.fn();
    const controller = new ButtonController(
      [],
      [{ keys: ['i', 'g'], holdTime: 1000, action: 'test', handler }],
      () => {}
    );

    fireEvent.keyDown(document, { key: 'i' });
    fireEvent.keyDown(document, { key: 'g' });

    await new Promise(r => setTimeout(r, 500));

    fireEvent.keyUp(document, { key: 'g' });

    await new Promise(r => setTimeout(r, 600));

    expect(handler).not.toHaveBeenCalled();
  });
});
```
