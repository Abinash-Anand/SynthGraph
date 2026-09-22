/** Shape returned by both `GET /auth/me` and `GET /auth/me/api-key`. */
export type User = {
  id: string;
  email: string;
};
