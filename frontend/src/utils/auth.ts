// Simple auth helpers using sessionStorage

export const isLoggedIn = (): boolean => {
  return sessionStorage.getItem("auth") === "true";
};

export const login = (): void => {
  sessionStorage.setItem("auth", "true");
};

export const logout = (): void => {
  sessionStorage.removeItem("auth");
};
