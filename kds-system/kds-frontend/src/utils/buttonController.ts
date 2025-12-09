export interface ButtonAction {
  key: string;
  action: string;
  handler: () => void;
}

export interface ComboAction {
  keys: string[];
  timeWindow: number; // Ventana de tiempo para detectar las teclas en secuencia
  action: string;
  handler: () => void;
  onProgress?: (progress: number) => void;
}

export class ButtonController {
  private lastActionTime: number = 0;
  private debounceTime: number;
  private actions: ButtonAction[];
  private combos: ComboAction[];

  // Para secuencia de teclas (combo)
  private keySequence: { key: string; time: number }[] = [];
  private comboExecuted: boolean = false;

  // Para evitar que teclas de combo ejecuten acciones simples
  private pendingComboCheck: ReturnType<typeof setTimeout> | null = null;
  private comboCheckDelay: number = 800; // Esperar 800ms para ver si llega otra tecla del combo

  constructor(
    actions: ButtonAction[],
    combos: ComboAction[],
    _onLog: (message: string) => void,
    debounceTime: number = 200
  ) {
    this.actions = actions;
    this.combos = combos;
    this.debounceTime = debounceTime;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const now = Date.now();

    // Prevenir comportamiento por defecto
    event.preventDefault();

    // Si ya ejecutamos un combo recientemente, ignorar
    if (this.comboExecuted) {
      return;
    }

    // Agregar a la secuencia
    this.keySequence.push({ key, time: now });

    // Limpiar teclas antiguas (más de 2 segundos)
    this.keySequence = this.keySequence.filter(k => now - k.time < 2000);

    // Verificar si esta tecla es parte de algún combo
    const isPartOfCombo = this.combos.some(c => c.keys.includes(key));

    if (isPartOfCombo) {
      // Cancelar check pendiente anterior
      if (this.pendingComboCheck) {
        clearTimeout(this.pendingComboCheck);
      }

      // Verificar combo inmediatamente
      if (this.checkAndExecuteCombo()) {
        return; // Combo ejecutado, no hacer nada más
      }

      // Si no se completó el combo, esperar un poco por si llega otra tecla
      this.pendingComboCheck = setTimeout(() => {
        this.pendingComboCheck = null;

        // Verificar de nuevo por si llegó otra tecla
        if (this.checkAndExecuteCombo()) {
          return;
        }

        // No se completó combo, limpiar secuencia
        this.keySequence = [];
      }, this.comboCheckDelay);

      return; // No ejecutar acción simple aún
    }

    // Tecla que NO es parte de combo - ejecutar inmediatamente
    // Debounce
    if (now - this.lastActionTime < this.debounceTime) {
      return;
    }

    this.executeSimpleAction(key);
  }

  private checkAndExecuteCombo(): boolean {
    const now = Date.now();

    for (const combo of this.combos) {
      // Obtener teclas recientes dentro de la ventana del combo
      const recentKeys = this.keySequence.filter(k => now - k.time < combo.timeWindow);
      const recentKeyNames = recentKeys.map(k => k.key);

      // Verificar si todas las teclas del combo están presentes
      const allKeysPresent = combo.keys.every(k => recentKeyNames.includes(k));

      if (allKeysPresent) {
        this.comboExecuted = true;

        if (combo.onProgress) {
          combo.onProgress(100);
        }

        // Ejecutar handler del combo
        combo.handler();
        this.lastActionTime = now;

        // Limpiar
        this.keySequence = [];
        if (this.pendingComboCheck) {
          clearTimeout(this.pendingComboCheck);
          this.pendingComboCheck = null;
        }

        // Resetear después de 1 segundo (para poder encender/apagar rápido)
        setTimeout(() => {
          this.comboExecuted = false;
          if (combo.onProgress) {
            combo.onProgress(0);
          }
        }, 1000);

        return true;
      }
    }

    return false;
  }

  private executeSimpleAction(key: string): void {
    const action = this.actions.find((a) => a.key === key);
    if (action) {
      this.lastActionTime = Date.now();
      action.handler();
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

    if (this.pendingComboCheck) {
      clearTimeout(this.pendingComboCheck);
    }

    this.keySequence = [];
    this.comboExecuted = false;
  }
}
