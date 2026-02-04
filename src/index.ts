import { createServer } from "node:http";

const port = Number(process.env.PORT) || 3000;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      ok: true,
      method: req.method,
      url: req.url
    })
  );
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
