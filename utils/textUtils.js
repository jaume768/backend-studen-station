/**
 * Normaliza un string eliminando acentos/tildes, convirtiendo a minúsculas y eliminando espacios extra
 * @param {string} str - String a normalizar
 * @returns {string} String normalizado
 */
function normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .normalize('NFD')                // Descompone los caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos/diacríticos
        .toLowerCase()                   // Convierte a minúsculas
        .trim()                         // Elimina espacios al inicio/final
        .replace(/\s+/g, ' ');          // Normaliza espacios múltiples a uno solo
}

/**
 * Crea una expresión regular que busca un término de forma normalizada
 * Esto permite encontrar coincidencias sin importar acentos, tildes, mayúsculas, etc.
 * @param {string} searchTerm - Término de búsqueda
 * @returns {RegExp} Expresión regular para búsqueda normalizada
 */
function createNormalizedRegex(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') return new RegExp('', 'i');
    
    // Crear un patrón que coincida con versiones acentuadas y sin acentos
    let pattern = searchTerm
        .toLowerCase()
        .trim()
        // Escapar caracteres especiales de regex ANTES de reemplazar
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Reemplazar cada carácter por su versión flexible (con y sin acentos)
        .replace(/a/g, '[aáàâãä]')
        .replace(/e/g, '[eéèêë]')
        .replace(/i/g, '[iíìîï]')
        .replace(/o/g, '[oóòôõö]')
        .replace(/u/g, '[uúùûü]')
        .replace(/n/g, '[nñ]')
        .replace(/c/g, '[cç]');
    
    return new RegExp(pattern, 'i');
}

/**
 * Crea un agregation pipeline para MongoDB que permite búsqueda normalizada
 * @param {string} field - Campo sobre el que hacer la búsqueda
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Object} Condición para agregation pipeline
 */
function createNormalizedSearchCondition(field, searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') return null;
    
    const normalizedTerm = normalizeString(searchTerm);
    if (!normalizedTerm) return null;
    
    return {
        $expr: {
            $regexMatch: {
                input: {
                    $toLower: {
                        $replaceAll: {
                            input: {
                                $replaceAll: {
                                    input: {
                                        $replaceAll: {
                                            input: {
                                                $replaceAll: {
                                                    input: {
                                                        $replaceAll: {
                                                            input: {
                                                                $replaceAll: {
                                                                    input: `$${field}`,
                                                                    find: "á",
                                                                    replacement: "a"
                                                                }
                                                            },
                                                            find: "é",
                                                            replacement: "e"
                                                        }
                                                    },
                                                    find: "í",
                                                    replacement: "i"
                                                }
                                            },
                                            find: "ó",
                                            replacement: "o"
                                        }
                                    },
                                    find: "ú",
                                    replacement: "u"
                                }
                            },
                            find: "ñ",
                            replacement: "n"
                        }
                    }
                },
                regex: normalizedTerm,
                options: "i"
            }
        }
    };
}

module.exports = {
    normalizeString,
    createNormalizedRegex,
    createNormalizedSearchCondition
};
