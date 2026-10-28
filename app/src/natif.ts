// Accès aux modules du téléphone (application Android).
// On passe directement par le pont de Capacitor, qui existe toujours dans l'application,
// même quand l'objet « Capacitor.Plugins » n'est pas rempli.
type Pont = {
  Plugins?: Record<string, unknown>;
  PluginHeaders?: { name: string }[];
  isPluginAvailable?: (nom: string) => boolean;
  nativePromise?: (plugin: string, methode: string, options?: unknown) => Promise<unknown>;
  nativeCallback?: (plugin: string, methode: string, options: unknown, rappel: (donnees: unknown) => void) => string;
};

function pont(): Pont | undefined {
  return (window as unknown as { Capacitor?: Pont }).Capacitor;
}

export function moduleDisponible(nom: string) {
  const c = pont();
  if (!c) return false;
  if (c.Plugins && nom in c.Plugins) return true;
  if (c.isPluginAvailable?.(nom)) return true;
  return !!c.PluginHeaders?.some((h) => h.name === nom);
}

/** Appelle une fonction d'un module du téléphone. */
export function appeler<T = unknown>(nom: string, methode: string, options: unknown = {}): Promise<T> {
  const c = pont();
  const direct = c?.Plugins?.[nom] as Record<string, (o: unknown) => Promise<T>> | undefined;
  if (direct && typeof direct[methode] === "function") return direct[methode](options);
  if (c?.nativePromise) return c.nativePromise(nom, methode, options) as Promise<T>;
  return Promise.reject(new Error(`Module ${nom} absent`));
}

/** Écoute un événement d'un module du téléphone (par exemple, l'avancement d'un téléchargement). */
export async function ecouter(nom: string, evenement: string, rappel: (donnees: never) => void): Promise<() => void> {
  const c = pont();
  const direct = c?.Plugins?.[nom] as { addListener?: (e: string, f: (d: never) => void) => Promise<{ remove: () => void }> } | undefined;
  if (direct?.addListener) {
    const h = await direct.addListener(evenement, rappel);
    return () => h.remove();
  }
  if (c?.nativeCallback) {
    const id = c.nativeCallback(nom, "addListener", { eventName: evenement }, rappel as (d: unknown) => void);
    return () => {
      c.nativePromise?.(nom, "removeListener", { eventName: evenement, callbackId: id }).catch(() => {});
    };
  }
  return () => {};
}
