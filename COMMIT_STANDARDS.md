## Estándares para mensajes de commit

Objetivo: mantener un historial claro, conciso y granular. Un commit por cada cambio mínimo para facilitar el mantenimiento y el seguimiento.

### Principios
- Cambios pequeños y atómicos: un commit por cada ajuste mínimo.
- Mensajes cortos y en modo imperativo.
- Enfocados al qué cambió, no al cómo.
- Consistencia en el formato: `TIPO: Mensaje`.

### Formato
```
TIPO: Mensaje claro y breve en una línea

[Cuerpo opcional en párrafos breves si aporta contexto]
```

- `TIPO` en MAYÚSCULAS.
- Máximo recomendado para la primera línea: ~72 caracteres.
- Evitar punto final en la primera línea.

### Tipos permitidos
- `FEAT`: Nueva funcionalidad para el usuario o API.
- `FIX`: Corrección de bug.
- `STYLE`: Cambios de estilo/código que no afectan la lógica (formato, comentarios, imports).
- `UPDATE`: Actualización de contenido, textos, datos generados o artefactos.
- `REFACTOR`: Cambios internos que no agregan features ni corrigen bugs.
- `PERF`: Mejora de rendimiento.
- `TEST`: Agregar o ajustar pruebas.
- `DOCS`: Cambios en documentación.
- `BUILD`: Cambios en build, dependencias, herramientas.
- `CI`: Cambios en pipelines/automatización.
- `CHORE`: Tareas de mantenimiento (limpieza, scripts menores, housekeeping).
- `REVERT`: Revertir un commit previo.

Nota: No usar scope por ahora (sin `TIPO(scope): ...`). Mantener el formato simple: `TIPO: Mensaje`.

### Ejemplos (referencia de estilo)
- `STYLE: Limpiar código de depuración y comentarios no utilizados`
- `FIX: Corregir propiedad activeColor a activeThumbColor en Switch de petOnTrip`
- `STYLE: Simplificar interpolación de string en radar_screen`
- `STYLE: Remover import no utilizado de foundation en LocalizationService`
- `UPDATE: Regenerar archivos de localización con todas las traducciones agregadas`
- `FIX: Agregar traducciones faltantes finales (passengersExampleHint, additionalFlightInfoHint, transfer_info_screen) a todos los idiomas`
- `UPDATE: Corregir textos hardcodeados en airport_search_modal y charter_screen, agregar selectDestinationForFlight y destinationSearchHint a todos los idiomas`
- `FIX: Agregar traducciones faltantes críticas (flightRadar, flightNumber, noTripsReserved, deletePassengerButton, writeMessageHint) a todos los idiomas`
- `UPDATE: Regenerar archivos de localización con nuevas claves agregadas`
- `FIX: Agregar claves de traducción faltantes (firstName, lastName, selectDate, country, gender, phone, personalData, passport, visa) a todos los idiomas`

### Reglas de granularidad
- Preferir dividir los cambios: cada archivo/ajuste independiente debe ser su propio commit si aporta valor por separado.
- Si un cambio requiere múltiples archivos pero es indivisible (rompería el proyecto si se separa), mantenerlo en un único commit.

### Cuerpo opcional
Usar sólo si realmente aporta contexto (por ejemplo, una causa raíz, un trade-off o una nota de migración). Mantenerlo corto.

### Referencias
- Para vincular issues/tickets (si aplica), agregar al final del cuerpo: `Refs: #123` o `Closes: #123`.

### Coautoría (opcional)
Agregar al final si corresponde:
```
Co-authored-by: Nombre Apellido <email@dominio.com>
```


