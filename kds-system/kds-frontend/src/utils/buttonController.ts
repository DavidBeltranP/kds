export interface ButtonAction {
  key: string;
  action: string;
  handler: () => void;
}

export interface ComboAction {
  keys: string[];
  holdTime: number;
  action: string;
  handler: () => void;
  onProgress?: (progress: number) => void;
}

export class ButtonController {
  private pressedKeys: Set<string> = new Set();
  private keyTimestamps: Map<string, number> = new Map();
  private lastActionTime: number = 0;
  private debounceTime: number;
  private actions: ButtonAction[];
  private combos: ComboAction[];
  private onLog: (message: string) => void;

  // Para secuencia de teclas (botonera que envía pulsos instantáneos)
  private keySequence: { key: string; time: number }[] = [];
  private sequenceWindow: number = 500; // Ventana de 500ms para detectar secuencia
  private sequenceComboExecuted: boolean = false;

  constructor(
    actions: ButtonAction[],
    combos: ComboAction[],
    onLog: (message: string) => void,
    debounceTime: number = 200
  ) {
    this.actions = actions;
    this.combos = combos;
    this.onLog = onLog;
    this.debounceTime = debounceTime;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const now = Date.now();

    // Prevenir comportamiento por defecto
    event.preventDefault();

    // Si ya ejecutamos un combo recientemente, ignorar TODOS los keydowns
    if (this.sequenceComboExecuted) {
      return;
    }

    // Limpiar teclas antiguas de la secuencia ANTES de agregar la nueva
    this.keySequence = this.keySequence.filter(k => now - k.time < this.sequenceWindow);

    // Agregar a la secuencia de teclas (siempre, aunque sea repetida)
    // Esto permite detectar secuencias rápidas de la botonera
    this.keySequence.push({ key, time: now });

    // Actualizar el set de teclas presionadas
    this.pressedKeys.add(key);
    this.keyTimestamps.set(key, now);

    // Verificar combos por secuencia
    this.checkSequenceCombos();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    event.preventDefault();

    // Si ya ejecutamos un combo recientemente, ignorar TODO
    if (this.sequenceComboExecuted) {
      this.pressedKeys.delete(key);
      this.keyTimestamps.delete(key);
      return;
    }

    // Si la tecla no estaba en nuestro registro, ignorar (evento fantasma)
    if (!this.pressedKeys.has(key)) {
      return;
    }

    this.pressedKeys.delete(key);
    this.keyTimestamps.delete(key);

    // Debounce
    const now = Date.now();
    if (now - this.lastActionTime < this.debounceTime) {
      return;
    }

    // Si esta tecla es parte de un combo, esperar un poco antes de ejecutar
    // para dar tiempo a que llegue la otra tecla del combo
    const isPartOfCombo = this.combos.some(c => c.keys.includes(key));
    if (isPartOfCombo) {
      // Guardar referencia al tiempo actual para verificar si se ejecutó combo
      const timeBeforeWait = this.lastActionTime;
      // Esperar 100ms para ver si se detecta un combo
      setTimeout(() => {
        // Si durante la espera se ejecutó un combo (lastActionTime cambió), no hacer nada
        if (this.sequenceComboExecuted || this.lastActionTime !== timeBeforeWait) {
          return;
        }
        // Si no se detectó combo, ejecutar la acción simple
        this.executeSimpleAction(key);
      }, 100);
    } else {
      // Tecla que no es parte de combo, ejecutar inmediatamente
      this.executeSimpleAction(key);
    }
  }

  /**
   * Verifica combos basado en secuencia de teclas (para botonera con pulsos instantáneos)
   * Detecta si todas las teclas del combo fueron presionadas dentro de la ventana de tiempo
   */
  private checkSequenceCombos(): void {
    // Si ya ejecutamos un combo y está en cooldown, no verificar
    if (this.sequenceComboExecuted) {
      return;
    }

    const now = Date.now();
    const recentKeys = this.keySequence.filter(k => now - k.time < this.sequenceWindow);
    const recentKeyNames = recentKeys.map(k => k.key);

    for (const combo of this.combos) {
      // Verificar si todas las teclas del combo están en la secuencia reciente
      const allKeysInSequence = combo.keys.every(k => recentKeyNames.includes(k));

      if (allKeysInSequence) {
        // IMPORTANTE: Marcar como ejecutado INMEDIATAMENTE para bloquear más detecciones
        this.sequenceComboExecuted = true;

        // Mostrar progreso visual
        if (combo.onProgress) {
          combo.onProgress(100);
        }

        // Ejecutar el combo
        this.executeCombo(combo);

        // Limpiar la secuencia
        this.keySequence = [];

        // Resetear después de 2 segundos para permitir nuevos combos
        setTimeout(() => {
          this.sequenceComboExecuted = false;
          this.pressedKeys.clear();
          this.keyTimestamps.clear();
          if (combo.onProgress) {
            combo.onProgress(0);
          }
        }, 2000);

        return;
      }
    }
  }

  private executeSimpleAction(key: string): void {
    const action = this.actions.find((a) => a.key === key);
    if (action) {
      this.lastActionTime = Date.now();
      action.handler();
    }
  }

  private executeCombo(combo: ComboAction): void {
    this.lastActionTime = Date.now();
    combo.handler();
  }

  public updateActions(actions: ButtonAction[]): void {
    this.actions = actions;
  }

  public updateCombos(combos: ComboAction[]): void {
    this.combos = combos;
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.keySequence = [];
    this.sequenceComboExecuted = false;
  }
}
