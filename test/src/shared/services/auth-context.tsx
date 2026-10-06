import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    clearAuth,
    getStoredUser,
    getToken,
    setStoredUser,
    setAuth,
    setToken,
    type PanelUser,
} from "@/shared/lib/auth-storage";
import {
    login,
    loginStudent,
    impersonateObserverSupport,
    logout as apiLogout,
    registerStudent,
    registerSupport,
    type StudentRegisterPayload,
} from "@/shared/services/auth-service";

type AuthContextValue = {
    user: PanelUser | null;
    actingAsSupport: PanelUser | null;
    actAsSupport: (supportId: number) => Promise<void>;
    returnToObserverAccount: () => void;
    observerUser: PanelUser | null;
    isAuthenticated: boolean;
    showLoginSplash: boolean;
    login: (loginValue: string, password: string) => Promise<PanelUser>;
    loginStudentAccount: (phone: string, password: string) => Promise<PanelUser>;
    register: (payload: RegisterPayload) => Promise<void>;
    registerStudentAccount: (payload: StudentRegisterPayload) => Promise<void>;
    completeLoginSplash: () => void;
    logout: () => void;
};

type RegisterPayload = {
    name: string;
    phone: string;
    password: string;
    password_confirmation: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<PanelUser | null>(() =>
        getToken() ? getStoredUser() : null,
    );
    const [actingAsSupport, setActingAsSupport] = useState<PanelUser | null>(null);
    const [observerUser, setObserverUser] = useState<PanelUser | null>(null);
    const [observerToken, setObserverToken] = useState<string | null>(null);
    const [showLoginSplash, setShowLoginSplash] = useState(false);

    const loginAction = useCallback(
        async (loginValue: string, password: string) => {
            const { user: authenticatedUser, token } = await login(
                loginValue,
                password,
            );
            setAuth(token, authenticatedUser);
            setUser(authenticatedUser);
            setShowLoginSplash(true);
            return authenticatedUser;
        },
        [],
    );

    const loginStudentAction = useCallback(
        async (phone: string, password: string) => {
            const { user: authenticatedUser, token } = await loginStudent(
                phone,
                password,
            );
            setAuth(token, authenticatedUser);
            setUser(authenticatedUser);
            setShowLoginSplash(true);
            return authenticatedUser;
        },
        [],
    );

    const register = useCallback(async (payload: RegisterPayload) => {
        const response = await registerSupport(payload);
        setAuth(response.token, response.user);
        setUser(response.user);
    }, []);

    const registerStudentAccount = useCallback(
        async (payload: StudentRegisterPayload) => {
            const response = await registerStudent(payload);
            setAuth(response.token, response.user);
            setUser(response.user);
        },
        [],
    );

    const logout = useCallback(() => {
        void apiLogout();
        clearAuth();
        setUser(null);
        setActingAsSupport(null);
        setShowLoginSplash(false);
    }, []);

    const actAsSupport = useCallback(async (supportId: number): Promise<void> => {
        if (user?.role !== "account_observer") return;
        const observerTokenValue = getToken();
        const response = await impersonateObserverSupport(supportId);
        if (observerTokenValue) setObserverToken(observerTokenValue);
        setObserverUser(user);
        setToken(response.token);
        setStoredUser(response.user);
        setUser(response.user);
        setActingAsSupport(response.user);
    }, [user]);
    const returnToObserverAccount = useCallback(() => {
        if (!observerUser || !observerToken) return;
        setToken(observerToken);
        setStoredUser(observerUser);
        setUser(observerUser);
        setObserverUser(null);
        setObserverToken(null);
        setActingAsSupport(null);
    }, [observerToken, observerUser]);

    const completeLoginSplash = useCallback(
        () => setShowLoginSplash(false),
        [],
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            actingAsSupport,
            observerUser,
            actAsSupport,
            returnToObserverAccount,
            isAuthenticated: user !== null,
            showLoginSplash,
            login: loginAction,
            loginStudentAccount: loginStudentAction,
            register,
            registerStudentAccount,
            completeLoginSplash,
            logout,
        }),
        [
            user,
            actingAsSupport,
            observerUser,
            actAsSupport,
            returnToObserverAccount,
            showLoginSplash,
            loginAction,
            loginStudentAction,
            register,
            registerStudentAccount,
            completeLoginSplash,
            logout,
        ],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
