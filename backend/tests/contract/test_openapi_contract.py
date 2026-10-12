"""Test de contrato: la API implementada cumple la especificación `docs/openapi.yaml`.

Para cada endpoint implementado compara, con el contrato documentado, los parámetros de ruta,
el cuerpo de la petición y el de la respuesta de éxito: campos, obligatorios, tipos, valores permitidos y restricciones.
Descripciones, ejemplos y formatos informativos no forman parte de la comparación.
"""

from pathlib import Path
from typing import Any

import pytest
import yaml

from app.main import create_app

SPEC_PATH = Path(__file__).resolve().parents[3] / "docs" / "openapi.yaml"
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}
# Formatos que forman parte del contrato (el resto, como "email" o "password", son informativos).
CONTRACT_FORMATS = {"uuid"}
CONSTRAINTS = ("minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "pattern", "uniqueItems")

Schema = dict[str, Any]


def load_documented() -> Schema:
    with SPEC_PATH.open(encoding="utf-8") as file:
        spec: Schema = yaml.safe_load(file)
    return spec


def load_implemented() -> Schema:
    return create_app().openapi()


def resolve(spec: Schema, node: Any) -> Any:
    """Sustituye recursivamente los `$ref` internos por su definición."""
    if isinstance(node, dict):
        if "$ref" in node:
            target: Any = spec
            for part in node["$ref"].removeprefix("#/").split("/"):
                target = target[part]
            return resolve(spec, target)
        return {key: resolve(spec, value) for key, value in node.items()}
    if isinstance(node, list):
        return [resolve(spec, item) for item in node]
    return node


def shape(schema: Schema) -> Any:
    """Forma comparable de un JSON Schema, independiente de cómo se haya escrito."""
    if "allOf" in schema:
        merged: Schema = {"type": "object", "properties": {}, "required": []}
        for part in schema["allOf"]:
            merged["properties"] |= part.get("properties", {})
            merged["required"] += part.get("required", [])
        return shape(merged)
    for key in ("anyOf", "oneOf"):
        if key in schema:
            options = [shape(option) for option in schema[key]]
            return {"oneOf": sorted(options, key=repr)}
    if "const" in schema:
        return {"enum": [schema["const"]]}
    if "enum" in schema:
        return {"enum": sorted(schema["enum"])}

    types = schema.get("type")
    if isinstance(types, list):
        # `type: [string, "null"]` equivale a `anyOf: [{type: string}, {type: null}]`.
        return shape({"oneOf": [{**schema, "type": single} for single in types]})
    result: Schema = {"type": types}
    result |= {key: schema[key] for key in CONSTRAINTS if key in schema}
    if schema.get("format") in CONTRACT_FORMATS:
        result["format"] = schema["format"]
    if types == "object" or "properties" in schema:
        result["type"] = "object"
        result["properties"] = {name: shape(prop) for name, prop in schema.get("properties", {}).items()}
        result["required"] = sorted(schema.get("required", []))
    if types == "array":
        result["items"] = shape(schema["items"])
    return result


def operations(spec: Schema) -> dict[tuple[str, str], Schema]:
    """Operaciones por (ruta, método). Los parámetros declarados a nivel de ruta se heredan."""
    result: dict[tuple[str, str], Schema] = {}
    for path, item in spec["paths"].items():
        shared = item.get("parameters", [])
        for method, operation in item.items():
            if method in HTTP_METHODS:
                merged = operation | {"parameters": shared + operation.get("parameters", [])}
                result[(path, method)] = resolve(spec, merged)
    return result


def success_body(operation: Schema) -> Any:
    """Forma del cuerpo JSON de éxito; para archivos (p. ej. PDF), los tipos de contenido."""
    for status in ("200", "201"):
        response = operation["responses"].get(status)
        if response and "content" in response:
            content = response["content"]
            if "application/json" in content:
                return shape(content["application/json"]["schema"])
            return {"media_types": sorted(content)}
    return None


def path_parameters(operation: Schema) -> dict[str, Any]:
    return {
        parameter["name"]: shape(parameter["schema"])
        for parameter in operation.get("parameters", [])
        if parameter["in"] == "path"
    }


def request_body(operation: Schema) -> Any:
    body = operation.get("requestBody")
    return shape(body["content"]["application/json"]["schema"]) if body else None


IMPLEMENTED = operations(load_implemented())
DOCUMENTED = operations(load_documented())
ENDPOINTS = sorted(IMPLEMENTED)


@pytest.mark.parametrize("endpoint", ENDPOINTS, ids=[f"{m.upper()} {p}" for p, m in ENDPOINTS])
def test_el_endpoint_esta_documentado(endpoint: tuple[str, str]) -> None:
    assert endpoint in DOCUMENTED


@pytest.mark.parametrize("endpoint", ENDPOINTS, ids=[f"{m.upper()} {p}" for p, m in ENDPOINTS])
def test_los_parametros_de_ruta_cumplen_el_contrato(endpoint: tuple[str, str]) -> None:
    assert path_parameters(IMPLEMENTED[endpoint]) == path_parameters(DOCUMENTED[endpoint])


@pytest.mark.parametrize("endpoint", ENDPOINTS, ids=[f"{m.upper()} {p}" for p, m in ENDPOINTS])
def test_la_peticion_cumple_el_contrato(endpoint: tuple[str, str]) -> None:
    assert request_body(IMPLEMENTED[endpoint]) == request_body(DOCUMENTED[endpoint])


@pytest.mark.parametrize("endpoint", ENDPOINTS, ids=[f"{m.upper()} {p}" for p, m in ENDPOINTS])
def test_la_respuesta_cumple_el_contrato(endpoint: tuple[str, str]) -> None:
    assert success_body(IMPLEMENTED[endpoint]) == success_body(DOCUMENTED[endpoint])
