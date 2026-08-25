export default async (req, res) => {
  const { reqHandler } = await import('../dist/gameHub-FE/server/server.mjs');
  return reqHandler(req, res);
};
