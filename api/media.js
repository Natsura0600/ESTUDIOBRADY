// Sirve las imágenes guardadas en R2, así el bucket puede quedar privado.
import { handler, send, query } from "./_lib/http.js";
import { getObject } from "./_lib/store.js";

export default handler({
  GET: async (req, res) => {
    const { k } = query(req);
    if (!k || !/^uploads\/[\w.-]+$/.test(k)) return send(res, 400, { error: "Clave inválida" });
    const obj = await getObject(k);
    if (!obj) return send(res, 404, { error: "No encontrada" });
    res.statusCode = 200;
    res.setHeader("Content-Type", obj.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(obj.body);
  },
});
