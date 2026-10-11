function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!resultado.success) {
      const detalles = resultado.error.issues.map((issue) => ({
        campo: issue.path.join("."),
        mensaje: issue.message,
      }));
      return res.status(400).json({ error: "Datos inválidos", detalles });
    }

    req.validated = resultado.data;
    next();
  };
}

module.exports = validate;