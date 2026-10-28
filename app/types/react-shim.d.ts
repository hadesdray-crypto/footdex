// Minimal React typings: the real @types packages are not installable in this sandbox.
declare module "react" {
  export type ReactNode = any;
  export type Key = string | number;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export type Dispatch<A> = (value: A) => void;
  export interface MutableRefObject<T> { current: T }
  export interface RefObject<T> { readonly current: T | null }
  export interface Context<T> { Provider: any; Consumer: any; _t?: T }
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactNode;
  export type CSSProperties = { [key: string]: string | number | undefined };
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly unknown[]): T;
  export function useRef<T>(initial: T): MutableRefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T>;
  export function useContext<T>(ctx: Context<T>): T;
  export function useSyncExternalStore<T>(subscribe: (cb: () => void) => () => void, get: () => T, getServer?: () => T): T;
  export function useDeferredValue<T>(value: T): T;
  export function useTransition(): [boolean, (cb: () => void) => void];
  export function createContext<T>(value: T): Context<T>;
  export function memo<T>(component: T): T;
  export const Fragment: any;
  export const StrictMode: any;
}
declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module "react-dom" {
  export function createPortal(children: any, container: Element): any;
  export function createPortal(children: any, container: Element): any;
}
declare module "react-dom/client" {
  export function createRoot(el: Element): { render(node: any): void };
}
declare module "react-icons/lu" {
  type Icon = (props: {
    className?: string;
    size?: number | string;
    strokeWidth?: number;
    style?: { [key: string]: string | number | undefined };
    "aria-hidden"?: boolean | "true";
    "aria-label"?: string;
    title?: string;
  }) => any;
  export const LuArrowLeft: Icon, LuArrowRight: Icon, LuBookMarked: Icon, LuBookOpen: Icon, LuCalendarDays: Icon, LuCheck: Icon,
    LuChevronLeft: Icon, LuCompass: Icon, LuUserPlus: Icon, LuSparkles: Icon, LuGlobe: Icon, LuPlus: Icon, LuMinus: Icon, LuPlane: Icon, LuFlag: Icon, LuMessageCircle: Icon, LuSettings: Icon, LuSquare: Icon, LuSend: Icon, LuCircleCheck: Icon, LuCopy: Icon, LuDownload: Icon, LuRefreshCw: Icon, LuUpload: Icon, LuChevronRight: Icon, LuExternalLink: Icon, LuFastForward: Icon, LuFilm: Icon, LuGem: Icon,
    LuGift: Icon, LuGraduationCap: Icon, LuHeart: Icon, LuHouse: Icon, LuLayers: Icon, LuLibrary: Icon,
    LuLock: Icon, LuMenu: Icon, LuMessageSquareQuote: Icon, LuPackageOpen: Icon, LuPlay: Icon, LuQuote: Icon,
    LuRotateCcw: Icon, LuSearch: Icon, LuShieldCheck: Icon, LuShirt: Icon, LuStar: Icon, LuStore: Icon,
    LuTrophy: Icon, LuUsers: Icon, LuVolume2: Icon, LuVolumeX: Icon, LuX: Icon, LuZap: Icon;
}
declare namespace JSX {
  interface IntrinsicElements { [name: string]: any }
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicAttributes { key?: string | number | null }
  type Element = any;
}
