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
  private comboTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private comboProgressIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private lastActionTime: number = 0;
  private debounceTime: number;
  private actions: ButtonAction[];
  private combos: ComboAction[];
  private onLog: (message: string) => void;

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

    // Evitar repetición por mantener presionado
    if (this.pressedKeys.has(key)) return;

    // Prevenir comportamiento por defecto
    event.preventDefault();

    this.pressedKeys.add(key);
    this.keyTimestamps.set(key, Date.now());

    this.onLog(`[BOTONERA] Key DOWN: ${key}`);

    // Verificar combos
    this.checkCombos();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    event.preventDefault();

    // Debounce
    const now = Date.now();
    if (now - this.lastActionTime < this.debounceTime) {
      this.pressedKeys.delete(key);
      this.keyTimestamps.delete(key);
      this.cancelAllCombos();
      return;
    }

    // Si no hay combo activo, ejecutar acción simple
    if (!this.hasActiveCombo()) {
      this.executeSimpleAction(key);
    }

    this.pressedKeys.delete(key);
    this.keyTimestamps.delete(key);
    this.cancelAllCombos();

    this.onLog(`[BOTONERA] Key UP: ${key}`);
  }

  private checkCombos(): void {
    for (const combo of this.combos) {
      const allPressed = combo.keys.every((k) => this.pressedKeys.has(k));

      if (allPressed) {
        const comboId = combo.keys.sort().join('+');

        // Cancelar timer existente
        this.cancelCombo(comboId);

        this.onLog(
          `[BOTONERA] Combo detectado: ${comboId}, esperando ${combo.holdTime}ms`
        );

        // Iniciar indicador de progreso
        if (combo.onProgress) {
          const startTime = Date.now();
          const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / combo.holdTime) * 100, 100);
            combo.onProgress!(progress);
          }, 50);
          this.comboProgressIntervals.set(comboId, progressInterval);
        }

        // Iniciar timer para ejecutar combo
        const timer = setTimeout(() => {
          this.executeCombo(combo);
          this.cancelCombo(comboId);
        }, combo.holdTime);

        this.comboTimers.set(comboId, timer);
      }
    }
  }

  private executeSimpleAction(key: string): void {
    const action = this.actions.find((a) => a.key === key);
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

  private cancelCombo(comboId: string): void {
    const timer = this.comboTimers.get(comboId);
    if (timer) {
      clearTimeout(timer);
      this.comboTimers.delete(comboId);
    }

    const progressInterval = this.comboProgressIntervals.get(comboId);
    if (progressInterval) {
      clearInterval(progressInterval);
      this.comboProgressIntervals.delete(comboId);
    }

    // Resetear progreso
    const combo = this.combos.find(
      (c) => c.keys.sort().join('+') === comboId
    );
    if (combo?.onProgress) {
      combo.onProgress(0);
    }
  }

  private cancelAllCombos(resetProgress: boolean = true): void {
    this.comboTimers.forEach((timer) => clearTimeout(timer));
    this.comboTimers.clear();

    this.comboProgressIntervals.forEach((interval) => clearInterval(interval));
    this.comboProgressIntervals.clear();

    // Resetear progreso de todos los combos (solo si no estamos destruyendo)
    if (resetProgress) {
      this.combos.forEach((combo) => {
        if (combo.onProgress) {
          combo.onProgress(0);
        }
      });
    }
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
    // No resetear progreso durante destroy para evitar setState en cleanup
    this.cancelAllCombos(false);
  }
}
