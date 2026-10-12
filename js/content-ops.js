/* Contenido del tema 01 — Operators, promotion, casting (nivel certificación OCP 1Z0-829 / 1Z0-830) */
(function () {
  'use strict';

  const SECTIONS = [
    {
      id: 'tipos', title: 'Los 8 tipos primitivos', blocks: [
        { p: 'Todo este tema gira alrededor de una idea: **cada tipo primitivo es una caja de un tamaño fijo**. Operar, promover y castear es, en el fondo, mover valores entre cajas de distinto tamaño. Si sabes los tamaños, sabes qué cabe dónde.' },
        { widget: 'sizes' },
        {
          table: {
            head: ['Tipo', 'Bits', 'Rango', 'Literal', 'Default (campo)'], rows: [
              ['[[byte]]', '8', '-128 … 127', '`(byte) 10`', '`0`'],
              ['[[short]]', '16', '-32 768 … 32 767', '`(short) 10`', '`0`'],
              ['[[char]]', '16', '0 … 65 535 (**sin signo**)', "`'A'` `'\\u0041'` `65`", "`'\\u0000'`"],
              ['[[int]]', '32', '-2 147 483 648 … 2 147 483 647', '`42` `0x2A` `052` `0b101010`', '`0`'],
              ['[[long]]', '64', '≈ ±9.22 × 10¹⁸', '`42L`', '`0L`'],
              ['[[float]]', '32', '≈ ±3.4 × 10³⁸ (~7 dígitos)', '`3.14f`', '`0.0f`'],
              ['[[double]]', '64', '≈ ±1.8 × 10³⁰⁸ (~15 dígitos)', '`3.14` `3.14d` `1e3`', '`0.0`'],
              ['[[boolean]]', '—', '`true` / `false`', '`true`', '`false`']
            ]
          }
        },
        { rule: 'Un literal entero sin sufijo **siempre es [[int]]**. Un literal con decimales o exponente sin sufijo **siempre es [[double]]**. Esto explica la mitad de los errores de compilación del examen.', title: 'Regla de oro' },
        { deep: '**Complemento a dos.** Los enteros con signo guardan el signo en el bit más alto (1 = negativo). `-1` son todos los bits en 1. Por eso el rango es asimétrico: hay un negativo más que positivos (`-128…127`). Y por eso `-Integer.MIN_VALUE` vuelve a ser `Integer.MIN_VALUE`: el positivo `2147483648` no existe en un int.', title: 'Cómo funciona por dentro' },
        { code: 'System.out.println(Byte.MIN_VALUE + " a " + Byte.MAX_VALUE);\nSystem.out.println(Integer.MAX_VALUE);\nSystem.out.println(-Integer.MIN_VALUE);   // ¡sigue siendo negativo!\nSystem.out.println((int) Character.MAX_VALUE);', note: 'Abre "Variables y bits" en el Lab para ver los bits reales.' },
        { trap: '[[boolean]] **NO es un número** (no como en C). No existe conversión entre boolean y ningún tipo numérico, **ni siquiera con cast**: `(int) true` no compila. Tampoco `if (1)`.' },
        { tip: 'Memoriza en BYTES: byte **1**, short **2**, char **2**, int **4**, long **8**, float **4**, double **8**. El char es el único entero **sin signo**.' }
      ]
    },
    {
      id: 'literales', title: 'Literales: cómo se escriben los valores', blocks: [
        { p: 'El tipo de un valor empieza en cómo lo escribes. El compilador mira el literal y decide su tipo **antes** de mirar la variable donde lo guardas.' },
        {
          table: {
            head: ['Forma', 'Ejemplo', 'Tipo', 'Valor'], rows: [
              ['Decimal', '`42`', '[[int]]', '42'],
              ['Octal (empieza por 0)', '`052`', '[[int]]', '42'],
              ['Hexadecimal (0x)', '`0x2A`', '[[int]]', '42'],
              ['Binario (0b)', '`0b10_1010`', '[[int]]', '42'],
              ['Sufijo L', '`42L`', '[[long]]', '42'],
              ['Sufijo f / F', '`4.2f`', '[[float]]', '4.2'],
              ['Con punto o exponente', '`4.2` `4.` `.5` `4e1`', '[[double]]', '`4e1` es 40.0 ¡double!'],
              ['Carácter', "`'A'` `'\\u0041'` `'\\n'`", '[[char]]', '65, 65, 10']
            ]
          }
        },
        { code: 'int dec = 42;\nint oct = 052;          // empieza por 0 → octal\nint hex = 0x2A;\nint bin = 0b10_1010;\nlong grande = 3_000_000_000L;\ndouble sci = 4.2e1;\nchar c = \'\\u0041\';\nSystem.out.println(dec + " " + oct + " " + hex + " " + bin);\nSystem.out.println(grande + " " + sci + " " + c);' },
        { rule: '**Guion bajo `_`**: solo puede ir **entre dígitos**. Prohibido: al inicio (`_1` es un nombre de variable), al final (`1_`), junto al punto (`1_.5`, `1._5`), junto al prefijo (`0x_1`, `0b_1`) o antes del sufijo (`1_L`, `1.5_f`). Varios seguidos sí valen: `1__000`. Y `0_7` es un octal válido.', title: 'Reglas del guion bajo' },
        { code: 'long l = 3000000000;   // ¿por qué falla si long sí lo soporta?', note: 'El literal es int ANTES de llegar a la variable.' },
        { code: 'float f = 3.14;', note: '3.14 es double; double → float pierde precisión.' },
        { code: 'int x = 08;', note: 'Empieza por 0 → octal → solo dígitos 0-7.' },
        { trap: '`2147483648` sin L no compila nunca… excepto en `-2147483648`. El signo menos es un operador aparte, pero el compilador hace la excepción porque ese valor sí existe en int.' }
      ]
    },
    {
      id: 'precedencia', title: 'Operadores, precedencia y orden de evaluación', blocks: [
        { p: 'Un operador **unario** usa 1 operando (`-x`, `x++`, `!b`), uno **binario** usa 2 (`a + b`), y el **ternario** usa 3 (`c ? a : b`). La **precedencia** decide cómo se agrupan cuando no hay paréntesis.' },
        {
          table: {
            head: ['#', 'Operadores', 'Nombre', 'Asociatividad'], rows: [
              ['1', '`x++` `x--`', 'Post-unarios', '→'],
              ['2', '`++x` `--x` `+x` `-x` `!` `~` `(tipo)`', 'Pre-unarios y cast', '←'],
              ['3', '`*` `/` `%`', 'Multiplicativos', '→'],
              ['4', '`+` `-`', 'Aditivos', '→'],
              ['5', '`<<` `>>` `>>>`', 'Desplazamiento', '→'],
              ['6', '`<` `>` `<=` `>=` `instanceof`', 'Relacionales', '→'],
              ['7', '`==` `!=`', 'Igualdad', '→'],
              ['8', '`&`', 'AND (bits / lógico)', '→'],
              ['9', '`^`', 'XOR', '→'],
              ['10', '`|`', 'OR (bits / lógico)', '→'],
              ['11', '`&&`', 'AND condicional', '→'],
              ['12', '`||`', 'OR condicional', '→'],
              ['13', '`? :`', 'Ternario', '←'],
              ['14', '`=` `+=` `-=` `*=` `/=` `%=` `&=` `^=` `|=` `<<=` `>>=` `>>>=`', 'Asignación', '←'],
              ['15', '`->`', 'Flecha (lambdas)', '←']
            ]
          }
        },
        { tip: 'Truco para recordarlo: **"Post, Pre, Mul, Sum, Shift, Compara, Iguala, & ^ |, && ||, ?:, ="**. Los de bits van en orden alfabético inverso del AND al OR: `&` → `^` → `|`.' },
        { rule: 'La precedencia solo dice **cómo se agrupa**. El **orden de evaluación de los operandos es SIEMPRE de izquierda a derecha.** En `a + b * c` primero se obtiene `a`, luego `b`, luego `c`; después se multiplica y por último se suma.', title: 'La regla que casi nadie sabe' },
        { code: 'int i = 1;\nint r = i++ + i++ * i++;   // 1 + 2 * 3\nSystem.out.println(r + " " + i);', note: 'Cada i++ se evalúa en orden de izquierda a derecha.' },
        { code: 'int r = 2 + 3 * 4 - 6 / 2 % 4;\nSystem.out.println(r);', note: 'Mira la pestaña "Árbol de tipos" del Lab para ver la agrupación.' },
        { code: 'int a, b, c;\na = b = c = 5;     // asignación: derecha a izquierda\nSystem.out.println(a + b + c);\nSystem.out.println(10 - 4 - 3);   // resta: izquierda a derecha', note: 'Asociatividad en acción.' },
        { game: 'escalera', text: 'Practica la precedencia con **La Escalera**: toca los operadores en el orden en que Java los aplica.' }
      ]
    },
    {
      id: 'aritmeticos', title: 'Aritméticos: + - * / %', blocks: [
        { rule: 'Si ambos operandos son enteros, `/` hace **división entera**: descarta los decimales **truncando hacia cero** (no redondea, no hace "floor"). `%` da el resto y **su signo es el del dividendo** (el de la izquierda).', title: 'División y módulo' },
        { code: 'System.out.println(7 / 2);     // 3\nSystem.out.println(-7 / 2);    // -3  (hacia cero, no -4)\nSystem.out.println(7 / 2.0);   // 3.5 (un double cambia todo)\nSystem.out.println(7 % 3);     // 1\nSystem.out.println(-7 % 3);    // -1 (signo del dividendo)\nSystem.out.println(7 % -3);    // 1\nSystem.out.println(5.5 % 2);   // 1.5 (% también con decimales)' },
        { trap: '**Dividir entre cero**: con enteros (`int`, `long`) lanza `ArithmeticException` en **ejecución** (¡sí compila!). Con `float`/`double` NO hay excepción: da `Infinity`, `-Infinity` o `NaN`.' },
        { code: 'System.out.println(1 / 0.0);\nSystem.out.println(-1 / 0.0);\nSystem.out.println(0.0 / 0);\nSystem.out.println(1 / 0);' },
        { deep: '**Overflow silencioso.** Un int tiene 32 bits. Si el resultado necesita más, los bits que sobran se tiran y el número "da la vuelta" como un cuentakilómetros. No hay error ni excepción. El examen ama esto:', title: 'Por dentro' },
        { code: 'System.out.println(Integer.MAX_VALUE + 1);\nlong mal = 1000000 * 1000000;      // ¡se desborda ANTES de llegar al long!\nlong bien = 1000000L * 1000000;\nSystem.out.println(mal);\nSystem.out.println(bien);', note: 'El tipo del lado derecho se decide sin mirar la variable.' },
        { code: 'System.out.println(0.1 + 0.2);\nSystem.out.println(0.1 + 0.2 == 0.3);', note: 'double es binario: 0.1 no tiene representación exacta.' }
      ]
    },
    {
      id: 'incrementos', title: 'Incremento y decremento: ++ y --', blocks: [
        {
          table: {
            head: ['Forma', 'Nombre', 'La expresión vale…', 'Ejemplo (x = 5)'], rows: [
              ['`++x`', 'Pre-incremento', 'el valor **nuevo**', '`y = ++x;` → y = 6, x = 6'],
              ['`x++`', 'Post-incremento', 'el valor **anterior**', '`y = x++;` → y = 5, x = 6'],
              ['`--x`', 'Pre-decremento', 'el valor **nuevo**', '`y = --x;` → y = 4, x = 4'],
              ['`x--`', 'Post-decremento', 'el valor **anterior**', '`y = x--;` → y = 5, x = 4']
            ]
          }
        },
        { rule: 'En **ambos** casos la variable cambia **inmediatamente**. La única diferencia es qué valor "devuelve" la expresión en ese momento.', title: 'Clave' },
        { code: 'int x = 5;\nint y = x++ + ++x;   // 5 + 7\nSystem.out.println(x + " " + y);', note: 'Abre en el Lab → "Paso a paso" para verlo en cámara lenta.' },
        { trap: '`x = x++;` **no cambia x**. Paso a paso: (1) `x++` vale 5, (2) x pasa a 6, (3) se asigna 5 a x. Resultado: 5.' },
        { code: 'int x = 5;\nx = x++;\nSystem.out.println(x);' },
        { rule: '`++`/`--` solo funcionan sobre **variables** (no literales `5++`, no expresiones `(a+b)++`, no variables `final`). Sobre `byte`, `short` y `char` incluyen un **cast implícito**: `b++` equivale a `b = (byte)(b + 1)`. Por eso compila… y por eso puede desbordar.', title: 'Restricciones' },
        { code: 'byte b = 127;\nb++;\nSystem.out.println(b);\nchar c = \'A\';\nc++;\nSystem.out.println(c);' },
        { code: '5++;', note: 'Solo variables.' },
        { game: 'rayosx', text: 'Mira cada `++` en cámara lenta con **Rayos X**: memoria animada paso a paso.' }
      ]
    },
    {
      id: 'relacionales', title: 'Relacionales e igualdad', blocks: [
        { p: '`<` `>` `<=` `>=` solo funcionan con números (incluido `char`). `==` y `!=` funcionan con números, con dos boolean o con dos referencias. Todos devuelven [[boolean]].' },
        { rule: 'Antes de comparar números se aplica **promoción numérica**: `10 == 10.0` es `true` (10 se vuelve 10.0) y `\'a\' == 97` es `true` (el char se vuelve int).', title: 'Comparar promueve' },
        { code: "System.out.println(10 == 10.0);\nSystem.out.println('a' == 97);\nSystem.out.println('a' < 'b');\nSystem.out.println(Double.NaN == Double.NaN);" },
        { trap: 'Con objetos, `==` compara **referencias** (¿es el mismo objeto?), no el contenido. Los literales String van al **String pool** y se reutilizan; los creados en ejecución son objetos nuevos.' },
        { code: 'String a = "hola";\nString b = "hola";\nString c = "ho";\nString d = c + "la";       // se crea en ejecución\nfinal String e = "ho";\nString f = e + "la";       // constante → se calcula al compilar\nSystem.out.println(a == b);\nSystem.out.println(a == d);\nSystem.out.println(a == f);' },
        { trap: '`if (x = 5)` **no compila**: `=` asigna y el resultado es int. Pero `if (flag = true)` **sí compila** (el resultado es boolean) ¡y siempre entra!' },
        { code: 'boolean flag = false;\nif (flag = true) System.out.println("entré: flag = " + flag);' }
      ]
    },
    {
      id: 'logicos', title: 'Lógicos y cortocircuito', blocks: [
        { widget: 'truth' },
        { rule: '`&&` y `||` hacen **cortocircuito**: si el lado izquierdo ya decide el resultado, el derecho **no se evalúa**. `&&` se detiene con `false`; `||` se detiene con `true`. En cambio `&`, `|` y `^` con boolean **siempre evalúan los dos lados**.', title: 'Cortocircuito' },
        { code: 'int x = 3;\nboolean r1 = x > 5 && x++ > 1;   // derecho NO se evalúa\nSystem.out.println(x + " " + r1);\nboolean r2 = x > 5 & x++ > 1;    // ambos se evalúan\nSystem.out.println(x + " " + r2);' },
        { trap: '`&&` tiene **más precedencia** que `||`. `a || b && c` es `a || (b && c)`. Si `a` es true, ¡todo lo demás se salta!' },
        { code: 'int n = 0;\nboolean r = true || n++ > 0 && n++ > 0;\nSystem.out.println(r + " " + n);' },
        { p: '`!` solo acepta boolean (`!5` no compila). `^` (XOR) es true cuando los dos lados son **distintos**.' }
      ]
    },
    {
      id: 'bits', title: 'Operadores de bits y desplazamiento', blocks: [
        { p: 'Con enteros, `&` `|` `^` operan **bit a bit** y `~` invierte todos los bits. Los operandos se promueven primero (byte/short/char → int).' },
        { code: 'System.out.println(5 & 3);   // 0101 & 0011 = 0001\nSystem.out.println(5 | 3);   // 0111\nSystem.out.println(5 ^ 3);   // 0110\nSystem.out.println(~5);      // -6  (~x == -x - 1)' },
        {
          table: {
            head: ['Operador', 'Qué hace', 'Ejemplo'], rows: [
              ['`<<`', 'Desplaza a la izquierda, rellena con 0 (≈ × 2ⁿ)', '`3 << 2` = 12'],
              ['`>>`', 'Derecha **con signo**: rellena con el bit de signo (≈ ÷ 2ⁿ)', '`-8 >> 1` = -4'],
              ['`>>>`', 'Derecha **sin signo**: rellena con 0', '`-1 >>> 28` = 15']
            ]
          }
        },
        { rule: 'En un desplazamiento, el tipo del resultado es el del **operando izquierdo promovido**. La distancia se toma **módulo 32** para int (`& 31`) y **módulo 64** para long. Así que `1 << 32` es `1`.', title: 'Detalle de examen' },
        { code: 'System.out.println(1 << 31);\nSystem.out.println(1 << 32);\nSystem.out.println(1L << 32);\nSystem.out.println(-1 >>> 1);' }
      ]
    },
    {
      id: 'asignacion', title: 'Asignación y asignación compuesta', blocks: [
        { p: 'La asignación `=` también es una **expresión**: devuelve el valor asignado. Por eso existen `a = b = 5` y `System.out.println(x = 3)`.' },
        { rule: '`x op= y` **NO** es exactamente `x = x op y`. Es **`x = (T)(x op y)`** donde T es el tipo de x: lleva un **cast implícito escondido**. Además, el valor de x se lee **antes** de evaluar y.', title: 'El cast escondido' },
        { code: 'short s = 10;\ns += 5;          // OK: s = (short)(s + 5)\n// s = s + 5;    // ✗ no compila: s + 5 es int\nint i = 10;\ni *= 2.5;        // i = (int)(10 * 2.5) = 25  ¡compila!\nSystem.out.println(s + " " + i);' },
        { code: 'short s = 10;\ns = s + 5;', note: 'Sin el operador compuesto no hay cast escondido.' },
        { code: 'int x = 5;\nx += x++ * 2;    // 5 + (5 * 2), el x original se leyó primero\nSystem.out.println(x);' },
        { trap: '`x =+ 3;` no es `x += 3`. Es `x = +3` (asignación de "más tres"). Igual `x =- 1` asigna -1. Compila y engaña.' },
        { code: 'int x = 10;\nx =+ 3;\nSystem.out.println(x);\nx =- 1;\nSystem.out.println(x);' }
      ]
    },
    {
      id: 'ternario', title: 'El operador ternario ? :', blocks: [
        { p: '`condición ? valorSiTrue : valorSiFalse`. La condición debe ser boolean. **Solo se evalúa una de las dos ramas**: si la otra tenía `++`, no ocurre.' },
        { code: 'int x = 5;\nint y = x > 3 ? x++ : x--;\nSystem.out.println(x + " " + y);' },
        { rule: 'El **tipo** del ternario se decide con **ambas** ramas, aunque solo se ejecute una. Si una es int y otra double, el resultado es double. Si una es `char`/`byte`/`short` y la otra una constante int que cabe, gana el tipo pequeño.', title: 'Tipo del ternario' },
        { code: "System.out.println(true ? 1 : 2.0);     // 1.0 ¡no 1!\nSystem.out.println(true ? 'x' : 0);     // x  (char)\nint i = 0;\nSystem.out.println(true ? 'x' : i);     // 120 (i no es constante → int)" },
        { p: 'Se asocia de derecha a izquierda: `a ? b : c ? d : e` es `a ? b : (c ? d : e)`.' },
        { code: 'int n = 15;\nString r = n > 20 ? "grande" : n > 10 ? "mediano" : "chico";\nSystem.out.println(r);' }
      ]
    },
    {
      id: 'promocion', title: 'Promoción numérica: las 4 reglas', blocks: [
        { p: 'Cuando un operador binario recibe dos números, Java primero los **iguala** a un tipo común. Estas son las 4 reglas oficiales que pide la certificación:' },
        { rule: '**1.** Si los operandos son de tipos distintos, el **más pequeño se promueve al más grande**.<br>**2.** Si uno es **entero** y el otro **punto flotante**, el entero se promueve al tipo flotante.<br>**3.** `byte`, `short` y `char` se promueven a **int** SIEMPRE que se usan con un operador binario aritmético, **aunque ninguno sea int**.<br>**4.** Tras la promoción, el **resultado tiene el tipo** de los operandos ya promovidos.', title: 'Las 4 reglas' },
        { widget: 'promo' },
        { deep: '**¿Por qué existe la regla 3?** La JVM no tiene instrucciones para sumar bytes ni shorts. Su juego de instrucciones solo tiene `iadd` (int), `ladd` (long), `fadd` (float) y `dadd` (double). Al cargar un byte en la pila de operandos se convierte en int. Este es el bytecode real de `byte a = 1, b = 2; int c = a + b;`:<pre class="mono" style="margin:10px 0 0;background:#060a18;padding:10px;border-radius:10px">iload_1    // carga a como int\niload_2    // carga b como int\niadd       // suma de ints\nistore_3   // guarda en c</pre>', title: 'Cómo funciona internamente' },
        { code: 'byte a = 10;\nbyte b = 20;\nbyte c = a + b;', note: 'Regla 3: a + b es int aunque ambos sean byte.' },
        { code: 'byte a = 10;\nbyte b = 20;\nbyte c = (byte) (a + b);   // paréntesis obligatorios\nint d = a + b;\nSystem.out.println(c + " " + d);' },
        { trap: '`(byte) a + b` NO castea la suma: el cast tiene más precedencia que `+`, así que solo castea `a`. El resultado sigue siendo int.' },
        { code: 'short x = 10;\nchar y = \'A\';\nlong z = 5;\nfloat f = 2.5f;\nvar r1 = x * y;     // int\nvar r2 = x + z;     // long\nvar r3 = z * f;     // float\nvar r4 = f + 1.0;   // double\nSystem.out.println(r1 + " " + r2 + " " + r3 + " " + r4);', note: 'Abre en el Lab → "Árbol de tipos".' },
        { tip: 'Las promociones NO aplican igual a `++`, `--` ni a `+=`, `-=`…: esos llevan un cast implícito de vuelta al tipo de la variable.' },
        { game: 'arena', text: 'Entrena tu velocidad con **Promotion Arena**: adivina el tipo del resultado contra el reloj.' }
      ]
    },
    {
      id: 'casting', title: 'Casting: ampliar y estrechar', blocks: [
        { p: '**Ampliación (widening)**: pasar a un tipo que abarca más. Es **automática**, no necesita cast. **Estrechamiento (narrowing)**: pasar a un tipo más pequeño. Requiere **cast explícito** `(tipo)` porque puedes perder datos.' },
        { widget: 'widen' },
        { trap: '`long` (64 bits) → `float` (32 bits) es ampliación **implícita** porque el **rango** de float es mayor, aunque puede perder **precisión**. Igual `int` → `float`. Y `char` ↔ `short`/`byte` siempre necesita cast en ambas direcciones (char no tiene signo).' },
        { code: 'int grande = 123456789;\nfloat f = grande;            // compila, pero...\nSystem.out.println(f);\nSystem.out.println((int) f);  // ¡perdió precisión!' },
        { deep: '**Estrechar enteros = cortar bits.** Al castear a un tipo más pequeño, Java conserva solo los bits bajos y tira el resto. El bit que queda más arriba pasa a ser el signo. `(byte) 200`: 200 = `11001000`; en byte el primer 1 es el signo → -56. Experimenta en el **Bit Lab**.', title: 'Por dentro' },
        { code: 'System.out.println((byte) 200);\nSystem.out.println((byte) 300);\nSystem.out.println((short) 70000);\nSystem.out.println((char) 65);\nSystem.out.println((int) \'A\');' },
        { rule: '**Decimal → entero**: (1) se **trunca** hacia cero, (2) si no cabe en int/long se **satura** al MAX/MIN, (3) `NaN` da 0. Para byte/short/char primero pasa a int y luego corta bits.', title: 'float/double → entero' },
        { code: 'System.out.println((int) 3.99);\nSystem.out.println((int) -3.99);\nSystem.out.println((int) 1e20);\nSystem.out.println((byte) 1e20);\nSystem.out.println((int) Double.NaN);' },
        { rule: '`byte b = 10;` compila aunque 10 sea int porque es una **constante de compilación** que **cabe** en byte. La excepción aplica solo si: el destino es `byte`, `short` o `char`, el valor es de tipo `byte`/`short`/`char`/`int` (¡no long, no float!), y es una constante (literal, operación de literales o variable `final` inicializada con constante).', title: 'La excepción de las constantes' },
        { code: 'final int k = 100;\nbyte b1 = k;          // ✓ k es constante y cabe\nbyte b2 = 50 + 50;    // ✓ constante 100\nchar c = \'A\' + 1;     // ✓ constante 66 → \'B\'\nSystem.out.println(b1 + " " + b2 + " " + c);' },
        { code: 'int m = 100;\nbyte b = m;', note: 'm no es final → no es constante.' },
        { code: 'byte b = 10L;', note: 'long nunca entra en la excepción.' },
        { trap: 'El cast tiene más precedencia que los aritméticos: `(int) 3.9 + 0.5` es `3 + 0.5` = 3.5 (double).' },
        { code: 'System.out.println((int) 3.9 + 0.5);\nSystem.out.println((int) (3.9 + 0.5));' },
        { game: 'bitlab', text: 'Mira los bits caer en el **Bit Lab** y pon a prueba tu intuición en **¿Compila?**' }
      ]
    },
    {
      id: 'trampas', title: 'Checklist de trampas del examen', blocks: [
        { p: 'Antes de responder cualquier pregunta de este tema, pasa mentalmente por esta lista:' },
        {
          list: [
            '¿Algún literal está fuera de rango? (`int` > 2147483647 sin `L`, `float` sin `f`)',
            '¿Hay `byte`/`short`/`char` en una operación binaria? → el resultado es **int**.',
            '¿Se asigna un resultado int a byte/short/char **sin** cast y **sin** ser constante? → **no compila**.',
            '¿Hay `+=`, `-=`, `++`? → cast implícito, compila (y puede desbordar).',
            '¿Hay `/` entre enteros? → trunca. ¿`%` con negativos? → signo del dividendo.',
            '¿División entre 0 entera? → `ArithmeticException` en ejecución. ¿Con decimales? → Infinity/NaN.',
            '¿Hay `x++` y `++x` mezclados? → evalúa de **izquierda a derecha**, con lápiz.',
            '¿Hay `x = x++`? → x no cambia.',
            '¿Hay `&&`/`||` con efectos secundarios a la derecha? → ¿se cortocircuitan?',
            '¿`&&` y `||` mezclados sin paréntesis? → `&&` primero.',
            '¿String con `+`? → izquierda a derecha: los números antes del String se suman.',
            '¿`==` con String? → compara referencias (pool vs. objeto nuevo).',
            '¿Ternario con tipos mezclados? → el tipo lo deciden las dos ramas.',
            '¿Cast seguido de operación? → el cast solo afecta al operando inmediato.',
            '¿Variable local sin inicializar? → no compila al leerla.',
            '¿`if (x = 5)`? → no compila. ¿`if (b = true)`? → compila.',
            '¿Overflow? → no hay error, el valor da la vuelta.'
          ]
        },
        { game: 'examen', text: '¿Listo? Ve al **Simulador de examen** y mide tu nivel real.' }
      ]
    }
  ];

  // ¿Compila? — el veredicto lo calcula el motor; `ok` se verifica en los tests
  const COMPILA = [
    { code: 'byte b = 127;', ok: true, why: '127 es una constante int que cabe en byte [-128, 127].' },
    { code: 'byte b = 128;', ok: false, why: '128 se sale del rango de byte por 1.' },
    { code: "short s = 'a';", ok: true, why: "'a' es la constante char 97, que cabe en short." },
    { code: 'char c = -1;', ok: false, why: 'char no tiene negativos: su rango es 0..65535.' },
    { code: "int i = 'A' + 'B';", ok: true, why: 'char + char = int (65 + 66 = 131). Asignar int a int es directo.' },
    { code: 'long l = 2147483648;', ok: false, why: 'El literal es int y se pasa del máximo int. Falta la L.' },
    { code: 'long l = 2147483648L;', ok: true, why: 'Con L el literal ya es long.' },
    { code: 'float f = 3.14;', ok: false, why: '3.14 es double. double → float necesita cast o sufijo f.' },
    { code: 'float f = 3;', ok: true, why: 'int → float es ampliación implícita.' },
    { code: 'double d = 3.14f;', ok: true, why: 'float → double es ampliación.' },
    { code: 'int i = 3.0;', ok: false, why: 'double → int es estrechamiento: requiere (int).' },
    { code: 'byte a = 1;\nbyte b = a + 1;', ok: false, why: 'a + 1 es int (regla 3) y a no es constante.' },
    { code: 'byte a = 1;\na += 1;', ok: true, why: '+= incluye un cast implícito a byte.' },
    { code: 'final byte a = 1;\nbyte b = a + 1;', ok: true, why: 'a es final con valor constante → a + 1 es la constante 2, que cabe.' },
    { code: 'int x = 10;\nbyte b = x;', ok: false, why: 'x no es final, así que no es constante. int → byte necesita cast.' },
    { code: 'byte b = 10L;', ok: false, why: 'La excepción de constantes no aplica a long.' },
    { code: 'long l = 10;\nint i = (int) l;', ok: true, why: 'Estrechamiento explícito con cast: siempre permitido entre numéricos.' },
    { code: 'boolean b = (boolean) 1;', ok: false, why: 'Nunca se puede castear entre boolean y números.' },
    { code: 'int x = 5;\nx + 1;', ok: false, why: '"not a statement": una expresión suelta no es una sentencia.' },
    { code: 'int x = 5;\nif (x = 6) { }', ok: false, why: 'x = 6 vale 6 (int), y if necesita boolean.' },
    { code: 'boolean f = false;\nif (f = true) { }', ok: true, why: 'f = true vale true (boolean): compila y siempre entra.' },
    { code: "char c = 'a';\nchar d = c + 1;", ok: false, why: 'c + 1 es int y c no es constante.' },
    { code: "char c = 'a';\nc++;", ok: true, why: '++ lleva cast implícito: c pasa a ser b.' },
    { code: 'int x = 1_000__000;', ok: true, why: 'Varios guiones bajos seguidos entre dígitos son válidos.' },
    { code: 'double d = 1_.5;', ok: false, why: 'El guion bajo no puede ir junto al punto decimal.' },
    { code: 'int x = 08;', ok: false, why: 'Empieza por 0 → octal → el 8 no existe en base 8.' },
    { code: 'long l = 5;\nfloat f = l;', ok: true, why: 'long → float es ampliación implícita (aunque pueda perder precisión).' },
    { code: 'int x;\nint y = x + 1;', ok: false, why: 'Las variables locales no tienen valor por defecto.' },
    { code: 'short s = 1;\nchar c = s;', ok: false, why: 'short → char necesita cast: uno tiene signo y el otro no.' },
    { code: 'var v = 10;\nv = 3.5;', ok: false, why: 'var infirió int. Asignar un double a int no compila.' },
    { code: 'int a = 5;\nint b = -a++;', ok: true, why: 'Es -(a++): el unario - se aplica al resultado del post-incremento.' },
    { code: 'int a = 5;\nint b = (a++)++;', ok: false, why: 'a++ produce un VALOR, no una variable: no se le puede aplicar ++.' },
    { code: 'String s = "a" + 1 + true;', ok: true, why: 'String + cualquier cosa = String.' },
    { code: 'int x = 10 / 0;', ok: true, why: '¡Compila! La ArithmeticException ocurre en ejecución.' },
    { code: 'int big = 2147483647 + 1;', ok: true, why: 'Compila: la suma desborda en silencio a -2147483648.' },
    { code: 'var a = 1, b = 2;', ok: false, why: 'var no permite declarar varias variables en una sentencia.' }
  ];

  // Predice la salida — `out` se verifica en los tests
  const PREDICE = [
    { code: 'System.out.println(10 / 4 * 4);', out: '8' },
    { code: 'System.out.println(10 / 4.0 * 4);', out: '10.0' },
    { code: 'System.out.println(7 % 3 * -2);', out: '-2' },
    { code: 'int x = 3;\nSystem.out.println(x++ + x++);', out: '7' },
    { code: 'int x = 3;\nSystem.out.println(++x * x--);', out: '16' },
    { code: 'System.out.println("" + 1 + 2);', out: '12' },
    { code: 'System.out.println(1 + 2 + "");', out: '3' },
    { code: "System.out.println('a' + 'b' + \"c\");", out: '195c' },
    { code: "System.out.println(\"c\" + 'a' + 'b');", out: 'cab' },
    { code: 'byte b = (byte) 255;\nSystem.out.println(b);', out: '-1' },
    { code: 'System.out.println((byte) 129);', out: '-127' },
    { code: 'System.out.println((int) -9.99);', out: '-9' },
    { code: 'int x = 5;\nx += x++ * 2;\nSystem.out.println(x);', out: '15' },
    { code: 'int a = 10;\nboolean b = a < 5 && ++a > 0;\nSystem.out.println(a + " " + b);', out: '10 false' },
    { code: 'System.out.println(1 << 31);', out: '-2147483648' },
    { code: 'System.out.println(Integer.MIN_VALUE - 1);', out: '2147483647' },
    { code: 'double d = 0.1 * 3;\nSystem.out.println(d == 0.3);', out: 'false' },
    { code: "int i = 'z' - 'a';\nSystem.out.println(i);", out: '25' },
    { code: 'System.out.println(-7 / 2 * 2 + -7 % 2);', out: '-7' },
    { code: 'int x = 10;\nint y = x-- - --x;\nSystem.out.println(x + " " + y);', out: '8 2' },
    { code: 'System.out.println(true ? 1 : 2.0);', out: '1.0' },
    { code: 'int k = 4;\nk = k++ + k--;\nSystem.out.println(k);', out: '9' }
  ];

  // La Escalera de precedencia (se declara int a = 2, b = 3, c = 4)
  const ESCALERA = [
    '2 + 3 * 4',
    'a * b + c / a',
    '10 - 4 - 3',
    'a + b * c - a % b',
    '-a + b * ++c',
    'a + b > c && a != b',
    'a < b | b < c & a == c',
    'a << 1 + b',
    'a & b | c ^ a',
    'a++ * b-- + c',
    '(a + b) * c % 5',
    'a + b + c * a / b',
    'a + b * c > a * b + c'
  ];

  // Rayos X — programas para ver en cámara lenta
  const RAYOSX = [
    { name: 'x++ + ++x', code: 'int x = 5;\nint y = x++ + ++x;\nSystem.out.println(x + " " + y);' },
    { name: 'x = x++ (la trampa)', code: 'int x = 5;\nx = x++;\nSystem.out.println(x);' },
    { name: 'Cortocircuito && vs &', code: 'int a = 0;\nboolean r1 = a > 0 && a++ > 0;\nboolean r2 = a > 0 & a++ > 0;\nSystem.out.println(a + " " + r1 + " " + r2);' },
    { name: 'i += i++ + ++i', code: 'int i = 1;\ni += i++ + ++i;\nSystem.out.println(i);' },
    { name: 'byte que desborda', code: 'byte b = 126;\nb++;\nb++;\nSystem.out.println(b);' },
    { name: 'x-- - --x', code: 'int x = 10;\nint y = x-- - --x;\nSystem.out.println(x + " " + y);' },
    { name: '|| con efectos', code: 'int a = 1, b = 2;\nboolean r = a++ > 1 || b-- < 3;\nSystem.out.println(a + " " + b + " " + r);' },
    { name: 'Ternario y ++', code: 'int x = 3;\nint y = x > 2 ? x++ : x--;\nSystem.out.println(x + " " + y);' },
    { name: 'Compuesto con cast oculto', code: 'short s = 32767;\ns += 1;\nint i = 7;\ni /= 2.0;\nSystem.out.println(s + " " + i);' }
  ];

  // Simulador de examen
  const EXAMEN = [
    { code: 'int x = 7;\nint y = x++ * 2 + --x;\nSystem.out.println(x + " " + y);', opts: ['8 21', '7 21', '7 22', '8 22', 'Compilation fails'], a: 1, why: 'x++ vale 7 (x pasa a 8); 7 * 2 = 14; --x deja x en 7 y vale 7; y = 14 + 7 = 21.' },
    { code: 'byte a = 10;\nbyte b = 20;\nbyte c = a + b;\nSystem.out.println(c);', opts: ['30', 'Compilation fails', 'Una excepción en ejecución', '-226'], a: 1, why: 'a + b es int (regla 3). Asignar int a byte sin cast no compila porque a y b no son constantes.' },
    { code: 'short s = 10;\ns += 5.9;\nSystem.out.println(s);', opts: ['15', '16', '15.9', 'Compilation fails'], a: 0, why: 's += 5.9 ≡ s = (short)(s + 5.9) = (short) 15.9 = 15 (trunca).' },
    { code: 'System.out.println(1 + 2 + "3" + 4 * 5);', opts: ['3320', '12320', '33 20', 'Compilation fails'], a: 0, why: '1 + 2 = 3 (aún no hay String); 3 + "3" = "33"; 4 * 5 = 20 por precedencia; "33" + 20 = "3320".' },
    { code: 'int i = 10;\nlong l = i * 1_000_000_000;\nSystem.out.println(l);', opts: ['10000000000', '1410065408', 'Compilation fails', 'ArithmeticException'], a: 1, why: 'i * 1_000_000_000 es int × int = int y desborda ANTES de convertirse a long.' },
    { code: 'int a = 5;\nboolean r = a > 3 || a++ > 4 && a++ > 5;\nSystem.out.println(a + " " + r);', opts: ['5 true', '6 true', '7 true', '7 false'], a: 0, why: '&& agrupa primero: a > 3 || (a++ > 4 && a++ > 5). Como a > 3 es true, || hace cortocircuito y no se ejecuta ningún a++.' },
    { q: '¿Cuál de estas líneas NO compila?', opts: ["`byte b = 'a';`", '`char c = 65;`', "`short s = 'a' + 1;`", '`float f = 1_000L;`', '`int i = 2.0f;`'], a: 4, why: "float → int es estrechamiento. Las otras: 'a' (97) y 98 son constantes que caben; 65 cabe en char; long → float es ampliación." },
    { code: 'double d = 10.0 / 0;\nint x = (int) d;\nSystem.out.println(d + " " + x);', opts: ['ArithmeticException', 'Infinity 2147483647', 'Infinity 0', 'NaN 0'], a: 1, why: '10.0 / 0 en double da Infinity (sin excepción). (int) Infinity se satura a Integer.MAX_VALUE.' },
    { code: 'int x = 10;\nx = x++ + x++;\nSystem.out.println(x);', opts: ['20', '21', '22', '12'], a: 1, why: 'Primer x++ vale 10 (x = 11), segundo vale 11 (x = 12); 10 + 11 = 21 y se asigna a x, pisando el 12.' },
    { code: "char c = 'A';\nc = c + 1;\nSystem.out.println(c);", opts: ['B', '66', 'Compilation fails', 'A'], a: 2, why: 'c + 1 es int; asignar int a char requiere cast. (c++ o c += 1 sí compilarían.)' },
    { code: 'System.out.println((byte) 130 + (short) -1);', opts: ['129', '-127', '127', 'Compilation fails'], a: 1, why: '(byte) 130 = -126 (130 − 256). -126 + (-1) = -127, de tipo int.' },
    { code: 'int a = 3, b = 4;\nint c = a > b ? a : b > 3 ? ++b : --a;\nSystem.out.println(a + " " + b + " " + c);', opts: ['3 5 5', '2 4 2', '3 4 4', '3 5 4'], a: 0, why: 'Ternario anidado a la derecha: a > b es false → se evalúa b > 3 ? ++b : --a → true → ++b = 5. --a nunca corre.' },
    { code: 'long x = 5;\nfloat f = x;\ndouble d = f;\nint i = d;\nSystem.out.println(i);', opts: ['5', '5.0', 'No compila por la línea 2', 'No compila por la línea 4'], a: 3, why: 'long → float y float → double son ampliaciones. double → int (línea 4) requiere cast.' },
    { code: 'int x = 0;\nif (x++ == 0 & ++x == 2 | x++ == 5)\n    System.out.println("yes " + x);\nelse\n    System.out.println("no " + x);', opts: ['yes 2', 'yes 3', 'no 3', 'no 2'], a: 1, why: '& y | no hacen cortocircuito: se evalúan los tres lados. true & true = true; | false = true. x terminó en 3.' },
    { code: 'int i = 1;\ni += i++ + ++i;\nSystem.out.println(i);', opts: ['4', '5', '6', '7'], a: 1, why: 'Se guarda i = 1 primero. i++ vale 1 (i = 2), ++i vale 3. 1 + (1 + 3) = 5.' },
    { code: 'System.out.println(-5 % 3 + " " + 5 % -3 + " " + -5 / 2);', opts: ['-2 2 -2', '1 -1 -3', '2 -2 -3', '-2 2 -3'], a: 0, why: '% toma el signo del dividendo: -5 % 3 = -2, 5 % -3 = 2. -5 / 2 trunca hacia cero: -2.' },
    { code: 'final int k = 100;\nbyte b1 = k;     // línea 2\nint m = 100;\nbyte b2 = m;     // línea 4', opts: ['Compila todo', 'Falla la línea 2', 'Falla la línea 4', 'Fallan la 2 y la 4'], a: 2, why: 'k es final con constante → constante de compilación que cabe en byte. m no es final → no es constante.' },
    { code: 'int x = 5;\nx =+ 2;\nx =- 1;\nSystem.out.println(x);', opts: ['6', '-1', '2', 'Compilation fails'], a: 1, why: '=+ y =- no son operadores compuestos: x = +2 y luego x = -1.' }
  ];

  const FLASH = [
    ['¿Tipo de un literal entero sin sufijo?', '[[int]]. Para long agrega `L`: `42L`.'],
    ['¿Tipo de `3.14`?', '[[double]]. Para float: `3.14f`.'],
    ['`byte + byte` = ?', '[[int]] — regla 3: byte, short y char siempre suben a int en operaciones binarias.'],
    ['¿Qué hace `++` sobre un byte?', 'Lleva un cast implícito: `b = (byte)(b + 1)`. Compila y puede desbordar: 127 → -128.'],
    ['`int x = 5; x = x++;` ¿x?', '**5**. x++ vale 5, x pasa a 6, y luego se asigna 5.'],
    ['`-7 / 2` = ?', '**-3**. La división entera trunca hacia cero.'],
    ['`-7 % 3` = ?', '**-1**. El signo del resto es el del dividendo.'],
    ['`1 / 0` vs `1 / 0.0`', '`ArithmeticException` vs `Infinity`.'],
    ['¿Cuándo compila `byte b = 100;` sin cast?', 'Cuando el valor es una **constante de compilación** de tipo byte/short/char/int y **cabe** en el rango.'],
    ['`final int k = 10; byte b = k;` ¿compila?', '**Sí**: k es final con valor constante.'],
    ['¿`long → float` es implícito?', '**Sí** (ampliación por rango), aunque puede perder precisión.'],
    ['¿`char → short` es implícito?', '**No**, ni `short → char`. Necesitan cast: char no tiene signo.'],
    ['`short s; s += 1;` vs `s = s + 1;`', 'El primero compila (cast oculto). El segundo **no**: s + 1 es int.'],
    ['¿Diferencia entre `&&` y `&`?', '`&&` hace cortocircuito. `&` siempre evalúa ambos lados.'],
    ['¿Quién va primero: `&&` o `||`?', '`&&`. `a || b && c` = `a || (b && c)`.'],
    ['`(int) 3.99` y `(int) -3.99`', '**3** y **-3**: se trunca hacia cero.'],
    ['`(byte) 200` = ?', '**-56**. Se conservan los 8 bits bajos: 200 − 256.'],
    ['`"" + 1 + 2` vs `1 + 2 + ""`', '`"12"` vs `"3"`: izquierda a derecha.'],
    ["`'a' + 1` = ?", "**98** (int). Para obtener 'b': `(char)('a' + 1)`."],
    ['¿En qué orden se evalúan los operandos?', '**Siempre de izquierda a derecha.** La precedencia solo decide la agrupación.'],
    ['`true ? 1 : 2.0` imprime…', '**1.0**: el tipo del ternario combina ambas ramas → double.'],
    ['`Integer.MAX_VALUE + 1` = ?', '`Integer.MIN_VALUE` (-2147483648). Overflow silencioso, sin error.'],
    ['`x =+ 5;` ¿qué hace?', 'Asigna **+5** a x. No es `+=`.'],
    ['¿Se puede castear boolean a int?', '**Nunca**, ni con cast.'],
    ['`1 << 32` (int) = ?', '**1**: la distancia se toma módulo 32.'],
    ['`Double.NaN == Double.NaN`', '**false**. NaN no es igual a nada.'],
    ['`(byte) a + b` ¿qué castea?', 'Solo **a**. El cast tiene más precedencia que +. Usa `(byte)(a + b)`.']
  ];

  const BITRETOS = [
    { e: '(byte) 200', a: '-56' }, { e: '(byte) -129', a: '127' }, { e: '(short) 40000', a: '-25536' },
    { e: '(char) 65601', a: 'A' }, { e: "(int) 'Z'", a: '90' }, { e: '(byte) 256', a: '0' },
    { e: '(int) 3.7e10', a: '2147483647' }, { e: '(byte) (127 + 1)', a: '-128' }, { e: '(int) (char) -1', a: '65535' },
    { e: '(byte) 0xFF', a: '-1' }, { e: '(short) 1e10', a: '-1' }, { e: '(int) -0.9', a: '0' }
  ];

  const LAB_EXAMPLES = [
    { name: '👋 Bienvenida: promoción en acción', code: '// Pulsa ▶ Ejecutar (Ctrl+Enter) y explora las pestañas →\nbyte a = 10;\nshort b = 20;\nint c = a + b * 2;\nc += 1.9;              // cast implícito escondido\nlong big = Integer.MAX_VALUE + 1;\nSystem.out.println(c);\nSystem.out.println(big);' },
    { name: 'Overflow de int', code: 'int max = Integer.MAX_VALUE;\nint uno = max + 1;\nlong ok = max + 1L;\nSystem.out.println(uno);\nSystem.out.println(ok);' },
    { name: 'Pre vs post incremento', code: 'int x = 5;\nint a = x++;\nint b = ++x;\nint c = x-- + --x;\nSystem.out.println(a + " " + b + " " + c + " " + x);' },
    { name: 'Cortocircuito', code: 'int n = 0;\nboolean r1 = (n > 0) && (n++ > 0);\nboolean r2 = (n > 0) || (n++ >= 0);\nboolean r3 = (n > 0) | (n++ > 0);\nSystem.out.println(n + " " + r1 + " " + r2 + " " + r3);' },
    { name: 'Casting que corta bits', code: 'int i = 300;\nbyte b = (byte) i;\nshort s = (short) 70000;\nchar c = (char) 66;\nint t = (int) -7.9;\nSystem.out.println(b + " " + s + " " + c + " " + t);' },
    { name: 'Constantes que sí caben', code: "final int k = 100;\nbyte b = k;\nchar c = 'A' + 2;\nshort s = 'z';\nSystem.out.println(b + \" \" + c + \" \" + s);" },
    { name: 'String: concatenación y pool', code: 'String s1 = 1 + 2 + "x" + 1 + 2;\nString a = "java";\nString b = "ja";\nString c = b + "va";\nSystem.out.println(s1);\nSystem.out.println(a == c);\nSystem.out.println(a == "ja" + "va");' },
    { name: 'Ternario y su tipo', code: "int i = 5;\nSystem.out.println(true ? 1 : 2.0);\nSystem.out.println(false ? 1 : 'A');\nSystem.out.println(false ? i : 'A');" },
    { name: 'Error: lossy conversion', code: 'byte a = 1;\nbyte b = 2;\nbyte c = a + b;   // ¿por qué falla?\nSystem.out.println(c);' },
    { name: 'Clase completa (estilo examen)', code: 'public class Main {\n    public static void main(String[] args) {\n        int x = 3;\n        long y = x * 2L;\n        float z = y / 4;\n        System.out.println(x + y + z);\n    }\n}' }
  ];

  window.TOPICS = window.TOPICS || {};
  window.TOPICS.ops = { id: 'ops', title: 'Operators, promotion, casting', SECTIONS, COMPILA, PREDICE, ESCALERA, RAYOSX, EXAMEN, FLASH, BITRETOS, LAB_EXAMPLES };
  if (typeof module !== 'undefined') module.exports = window.TOPICS.ops;
})();
