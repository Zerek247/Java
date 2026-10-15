/* Banco de preguntas por sección del tema 01. Formato: { code?, q?, opts, a (índice correcto), why }.
   Las preguntas con código se verifican contra el motor en tests/content.test.js */
(function () {
  'use strict';
  const NC = 'No compila';

  const QUIZ = {
    tipos: [
      { q: '¿Cuántos bits tiene un `char`?', opts: ['8', '16', '32', 'Depende de la JVM'], a: 1, why: 'char ocupa 16 bits (2 bytes), igual que short, pero sin signo.' },
      { q: '¿Cuál es el rango de `byte`?', opts: ['0 a 255', '-128 a 127', '-127 a 128', '-256 a 255'], a: 1, why: '8 bits con signo en complemento a dos: -2⁷ … 2⁷-1.' },
      { q: '¿Cuál de estos tipos NO admite negativos?', opts: ['`short`', '`byte`', '`char`', '`int`'], a: 2, why: 'char es el único entero sin signo: 0 … 65535.' },
      { q: '¿Qué tipo tiene el literal `100`?', opts: ['[[byte]]', '[[short]]', '[[int]]', '[[long]]'], a: 2, why: 'Todo literal entero sin sufijo es int, aunque sea pequeño.' },
      { q: '¿Qué tipo tiene el literal `2.5`?', opts: ['[[float]]', '[[double]]', '[[int]]', 'Depende de la variable'], a: 1, why: 'Un literal con decimales sin sufijo siempre es double. Para float: 2.5f.' },
      { code: 'System.out.println(Byte.MAX_VALUE + 1);', opts: ['-128', '128', '127', 'Compilation fails'], a: 1, why: 'Byte.MAX_VALUE (127) se promueve a int al sumar 1: el resultado es el int 128, no hay overflow.' },
      { code: 'boolean b = 0;', q: '¿Compila?', opts: ['Sí, b vale false', 'Sí, b vale true', NC], a: 2, why: 'boolean no es numérico: 0 no se convierte a false.' },
      { code: 'System.out.println(-Integer.MIN_VALUE == Integer.MIN_VALUE);', opts: ['true', 'false', 'Compilation fails'], a: 0, why: 'El positivo 2147483648 no cabe en int: negar MIN_VALUE desborda y vuelve a MIN_VALUE.' },
      { q: '¿Valor por defecto de un **campo** `double`?', opts: ['`0`', '`0.0`', '`null`', 'No tiene'], a: 1, why: 'Los campos numéricos se inicializan a cero: 0.0 para double. (Las variables locales no tienen valor por defecto.)' },
      { q: '¿Cuántos bytes ocupa un `long`?', opts: ['4', '8', '16', '2'], a: 1, why: 'long = 64 bits = 8 bytes.' }
    ],
    literales: [
      { code: 'System.out.println(010 + 0x10 + 0b10);', opts: ['30', '26', '28', 'Compilation fails'], a: 1, why: '010 es octal (8), 0x10 hexadecimal (16), 0b10 binario (2): 8 + 16 + 2 = 26.' },
      { q: '¿Cuál de estos literales es válido?', opts: ['`1_000_`', '`0x_FF`', '`1__000`', '`1_.5`'], a: 2, why: 'Varios guiones bajos seguidos entre dígitos son válidos. Los demás tienen _ al final, junto al prefijo o junto al punto.' },
      { code: 'long x = 2147483648;', q: '¿Compila?', opts: ['Compila', NC], a: 1, why: 'El literal sin L es int y se pasa del máximo int. Hace falta 2147483648L.' },
      { code: 'float f = 1e3;', q: '¿Compila?', opts: ['Compila: f vale 1000.0', NC], a: 1, why: 'La notación científica produce un double. double → float requiere cast o sufijo f (1e3f).' },
      { code: "char c = '\\u0041';\nSystem.out.println(c);", opts: ['A', '\\u0041', '65', 'Compilation fails'], a: 0, why: '\\u0041 es el código Unicode 65, que es la letra A. println(char) imprime el carácter.' },
      { code: 'System.out.println(0b1111 + 1L);', opts: ['16', '1111', '15', 'Compilation fails'], a: 0, why: '0b1111 es 15 en binario; 15 + 1L = 16 (long).' },
      { q: '¿Qué tipo tiene `4e2`?', opts: ['[[int]]', '[[float]]', '[[double]]', '[[long]]'], a: 2, why: 'Con exponente y sin sufijo es double: 400.0.' },
      { code: 'int x = 0_7;\nSystem.out.println(x);', opts: ['7', '07', '0', 'Compilation fails'], a: 0, why: 'Empieza por 0 → octal. El guion bajo está entre dígitos, así que es válido. 07 en octal es 7.' },
      { code: 'int x = 09;', q: '¿Compila?', opts: ['Compila, x vale 9', NC], a: 1, why: 'Un 0 inicial indica octal, y en base 8 no existe el dígito 9.' },
      { code: 'long a = 5l;\nfloat b = 5F;\ndouble c = 5D;\nSystem.out.println(a + b + c);', opts: ['15.0', '15', 'Compilation fails', '555'], a: 0, why: 'Los sufijos pueden ir en minúscula o mayúscula. long + float = float; + double = double → 15.0.' }
    ],
    precedencia: [
      { code: 'System.out.println(2 + 3 * 4 % 5);', opts: ['4', '0', '14', '5'], a: 0, why: '* y % tienen igual precedencia y se asocian a la izquierda: (3 * 4) % 5 = 2; luego 2 + 2 = 4.' },
      { code: 'int i = 2;\nint r = i++ + i * i--;\nSystem.out.println(r);', opts: ['11', '10', '12', '8'], a: 0, why: 'De izquierda a derecha: i++ vale 2 (i = 3); i vale 3; i-- vale 3 (i = 2). 2 + 3 * 3 = 11.' },
      { code: 'System.out.println(20 - 10 - 5);', opts: ['5', '15', '-5', 'Compilation fails'], a: 0, why: 'La resta se asocia a la izquierda: (20 - 10) - 5 = 5.' },
      { q: 'En `a + b * c`, ¿qué **operando** se evalúa primero?', opts: ['`c`', '`a`', '`b * c` antes de leer `a`', 'Depende del compilador'], a: 1, why: 'Los operandos SIEMPRE se evalúan de izquierda a derecha. La precedencia solo decide que * se aplica antes que +.' },
      { code: 'int a, b;\na = b = 3;\nSystem.out.println(a * b);', opts: ['9', '6', '3', 'Compilation fails'], a: 0, why: 'La asignación se asocia a la derecha: b = 3, luego a = 3. 3 * 3 = 9.' },
      { q: '¿Qué operador tiene MAYOR precedencia?', opts: ['`&&`', '`==`', '`+`', '`?:`'], a: 2, why: 'Orden: aditivos (+) > igualdad (==) > && > ternario.' },
      { code: 'boolean r = 3 + 2 > 4 == true;\nSystem.out.println(r);', opts: ['true', 'false', 'Compilation fails'], a: 0, why: '+ primero (5), luego > (5 > 4 = true), luego == (true == true).' },
      { code: 'int x = 10;\nx = x - 2 * 3 + 1;\nSystem.out.println(x);', opts: ['5', '25', '3', '-5'], a: 0, why: '2 * 3 = 6; luego de izquierda a derecha: 10 - 6 + 1 = 5.' },
      { q: '¿Qué asociatividad tiene el operador de asignación `=`?', opts: ['Izquierda a derecha', 'Derecha a izquierda', 'No tiene', 'Depende del tipo'], a: 1, why: 'a = b = c se agrupa como a = (b = c).' }
    ],
    aritmeticos: [
      { code: 'System.out.println(9 / 2 * 2);', opts: ['8', '9', '9.0', '10'], a: 0, why: '9 / 2 es división entera = 4; 4 * 2 = 8.' },
      { code: 'System.out.println(-9 % 4);', opts: ['-1', '1', '3', '-3'], a: 0, why: 'El signo del resto es el del dividendo (-9): -9 = -2 * 4 + (-1).' },
      { code: 'System.out.println(9 % -4);', opts: ['1', '-1', '3', '-3'], a: 0, why: 'El dividendo (9) es positivo → el resto es positivo.' },
      { code: 'System.out.println(5 / 0.0);', opts: ['Infinity', '0', 'NaN', 'ArithmeticException'], a: 0, why: 'Con punto flotante, dividir por cero da Infinity (sin excepción).' },
      { code: 'int x = 5 / 0;', q: '¿Qué ocurre?', opts: [NC, 'Compila y x vale 0', 'Compila, pero lanza ArithmeticException al ejecutar', 'Compila y x vale Infinity'], a: 2, why: 'El compilador no lo detecta: la división entera entre 0 falla en ejecución.' },
      { code: 'long r = Integer.MAX_VALUE * 2;\nSystem.out.println(r);', opts: ['4294967294', '-2', '2147483647', 'Compilation fails'], a: 1, why: 'int * int = int: desborda ANTES de guardarse en el long. 0x7FFFFFFF * 2 = 0xFFFFFFFE = -2.' },
      { code: 'System.out.println(7.0 % 2.5);', opts: ['2.0', '2', '0.5', 'Compilation fails'], a: 0, why: '% también funciona con decimales: 7.0 = 2 * 2.5 + 2.0.' },
      { code: 'System.out.println(1 / 2 + 1 / 2.0);', opts: ['0.5', '1.0', '0', '1'], a: 0, why: '1 / 2 = 0 (entera); 1 / 2.0 = 0.5; 0 + 0.5 = 0.5.' },
      { code: 'System.out.println(-7 / 2);', opts: ['-3', '-4', '-3.5', '3'], a: 0, why: 'La división entera trunca hacia cero, no redondea hacia abajo.' }
    ],
    incrementos: [
      { code: 'int x = 3;\nint y = ++x + x++;\nSystem.out.println(x + " " + y);', opts: ['5 8', '5 9', '4 8', '5 7'], a: 0, why: '++x: x = 4 y vale 4. x++: vale 4 y x = 5. y = 8.' },
      { code: 'int x = 1;\nx = x++ + x++;\nSystem.out.println(x);', opts: ['3', '4', '2', '5'], a: 0, why: 'x++ vale 1 (x = 2), x++ vale 2 (x = 3); 1 + 2 = 3 se asigna a x.' },
      { code: 'int a = 5;\nint b = a-- - --a;\nSystem.out.println(a + " " + b);', opts: ['3 2', '3 0', '4 1', '3 1'], a: 0, why: 'a-- vale 5 (a = 4); --a deja a = 3 y vale 3. b = 5 - 3 = 2.' },
      { code: 'final int x = 1;\nx++;', q: '¿Compila?', opts: ['Compila', NC], a: 1, why: '++ modifica la variable, y una final no se puede reasignar.' },
      { code: 'byte b = -128;\nb--;\nSystem.out.println(b);', opts: ['127', '-129', '-128', 'Compilation fails'], a: 0, why: 'b-- lleva un cast implícito a byte: -129 no cabe y da la vuelta a 127.' },
      { code: 'int x = 2;\nSystem.out.println(x++ * x++ * x++);', opts: ['24', '8', '27', '60'], a: 0, why: '2 * 3 * 4 = 24 (x termina en 5).' },
      { code: "char c = 'a';\nc += 2;\nc++;\nSystem.out.println(c);", opts: ['d', '100', 'c', 'Compilation fails'], a: 0, why: "'a' + 2 = 'c'; c++ = 'd'. Ambos llevan cast implícito a char." },
      { code: 'int i = 0;\ni = i++ + ++i;\nSystem.out.println(i);', opts: ['2', '1', '3', '0'], a: 0, why: 'i++ vale 0 (i = 1); ++i deja i = 2 y vale 2. 0 + 2 = 2.' },
      { code: 'int x = 5;\nint y = -x++;\nSystem.out.println(x + " " + y);', opts: ['6 -5', '6 -6', '5 -5', 'Compilation fails'], a: 0, why: 'Es -(x++): x++ vale 5 (x = 6) y luego se niega → -5.' }
    ],
    relacionales: [
      { code: 'System.out.println(5 == 5.0f);', opts: ['true', 'false', 'Compilation fails'], a: 0, why: 'El int 5 se promueve a float 5.0f antes de comparar.' },
      { code: "System.out.println('A' + 1 > 'B');", opts: ['false', 'true', 'Compilation fails'], a: 0, why: "'A' + 1 = 66 y 'B' = 66: 66 > 66 es false." },
      { code: 'int x = 5;\nboolean b = x == 5 != false;\nSystem.out.println(b);', opts: ['true', 'false', 'Compilation fails'], a: 0, why: '== y != tienen la misma precedencia (izquierda a derecha): (x == 5) != false → true != false → true.' },
      { code: 'boolean b = 1 < 2 < 3;', q: '¿Qué pasa?', opts: ['b vale true', 'b vale false', NC], a: 2, why: '1 < 2 da boolean, y boolean < 3 no está definido. Java no encadena comparaciones.' },
      { code: 'System.out.println(10 != 10L);', opts: ['false', 'true', 'Compilation fails'], a: 0, why: 'El int 10 se promueve a long antes de comparar: 10L != 10L es false.' },
      { code: "System.out.println('a' + 'b' == 195);", opts: ['true', 'false', 'Compilation fails'], a: 0, why: "+ tiene más precedencia que ==: 'a' + 'b' = 97 + 98 = 195 (int), y 195 == 195." },
      { code: 'int x = 3;\nboolean b = (x = 4);', q: '¿Qué pasa?', opts: ['b vale true', 'b vale false', NC], a: 2, why: 'x = 4 ASIGNA (no compara) y vale 4, un int. Un int nunca se convierte a boolean. Para comparar se usa ==.' },
      { code: 'boolean f = false;\nboolean r = (f = true);\nSystem.out.println(r + " " + f);', opts: ['true true', 'false false', 'false true', 'Compilation fails'], a: 0, why: 'f = true asigna true a f y la expresión vale true (boolean), así que sí compila. Es la trampa de confundir = con ==.' },
      { code: 'double d = Double.NaN;\nSystem.out.println(d != d);', opts: ['true', 'false', 'Compilation fails'], a: 0, why: 'NaN no es igual a nada, ni a sí mismo: d != d es true.' },
      { code: 'System.out.println(true == 1);', opts: ['true', 'false', NC], a: 2, why: 'No se puede comparar boolean con int.' }
    ],
    logicos: [
      { code: 'int x = 0;\nboolean r = x != 0 && 10 / x > 1;\nSystem.out.println(r);', opts: ['false', 'true', 'Lanza ArithmeticException', 'Compilation fails'], a: 0, why: 'x != 0 es false → && hace cortocircuito y la división nunca se ejecuta.' },
      { code: 'int x = 0;\nboolean r = x != 0 & 10 / x > 1;\nSystem.out.println(r);', opts: ['false', 'true', 'Lanza ArithmeticException', 'Compilation fails'], a: 2, why: '& evalúa siempre ambos lados: se ejecuta 10 / 0 en enteros.' },
      { code: 'System.out.println(true || false && false);', opts: ['true', 'false'], a: 0, why: '&& va primero: true || (false && false) = true.' },
      { code: 'System.out.println((true || false) && false);', opts: ['false', 'true'], a: 0, why: 'Los paréntesis fuerzan el || primero: true && false = false.' },
      { code: 'int a = 1;\nboolean r = a++ > 1 || a++ > 1;\nSystem.out.println(a + " " + r);', opts: ['3 true', '2 true', '3 false', '2 false'], a: 0, why: '1 > 1 es false (a = 2) → || evalúa el derecho: 2 > 1 es true (a = 3).' },
      { code: 'System.out.println(true ^ false ^ true);', opts: ['false', 'true'], a: 0, why: '(true ^ false) = true; true ^ true = false.' },
      { code: 'boolean b = !1;', q: '¿Qué pasa?', opts: ['b vale false', 'b vale true', NC], a: 2, why: '! solo acepta boolean.' },
      { code: 'int n = 5;\nboolean r = n > 3 | n++ > 10;\nSystem.out.println(n + " " + r);', opts: ['6 true', '5 true', '6 false', '5 false'], a: 0, why: '| no hace cortocircuito: n++ se ejecuta igualmente. true | false = true.' },
      { code: 'int n = 5;\nboolean r = n > 3 || n++ > 10;\nSystem.out.println(n + " " + r);', opts: ['5 true', '6 true', '6 false', '5 false'], a: 0, why: '|| hace cortocircuito con true: n++ nunca se ejecuta.' }
    ],
    bits: [
      { code: 'System.out.println(6 & 3);', opts: ['2', '7', '5', '1'], a: 0, why: '110 & 011 = 010 = 2.' },
      { code: 'System.out.println(6 | 3);', opts: ['7', '2', '5', '9'], a: 0, why: '110 | 011 = 111 = 7.' },
      { code: 'System.out.println(6 ^ 3);', opts: ['5', '7', '2', '9'], a: 0, why: '110 ^ 011 = 101 = 5.' },
      { code: 'System.out.println(~0);', opts: ['-1', '0', '1', 'Compilation fails'], a: 0, why: '~ invierte todos los bits: 32 unos = -1. Regla: ~x == -x - 1.' },
      { code: 'System.out.println(5 << 2);', opts: ['20', '10', '7', '1'], a: 0, why: '5 << 2 = 5 × 2² = 20.' },
      { code: 'System.out.println(-16 >> 2);', opts: ['-4', '4', '1073741820', 'Compilation fails'], a: 0, why: '>> conserva el signo: -16 / 4 = -4.' },
      { code: 'System.out.println(1 << 33);', opts: ['2', '0', '8589934592', 'Compilation fails'], a: 0, why: 'En int la distancia se toma módulo 32: 33 & 31 = 1 → 1 << 1 = 2.' },
      { q: 'Si `b` es `byte`, ¿qué tipo tiene `b << 1L`?', opts: ['[[byte]]', '[[int]]', '[[long]]', 'No compila'], a: 1, why: 'En los desplazamientos el resultado es el tipo del operando IZQUIERDO promovido (byte → int). El long de la derecha no influye.' },
      { code: 'System.out.println(~7 + 1);', opts: ['-7', '-8', '8', '-6'], a: 0, why: '~7 = -8; -8 + 1 = -7. (~x + 1 es la negación en complemento a dos.)' }
    ],
    asignacion: [
      { code: 'short s = 5;\ns *= 2.6;\nSystem.out.println(s);', opts: ['13', '13.0', NC, '10'], a: 0, why: 's = (short)(5 * 2.6) = (short) 13.0 = 13.' },
      { code: 'short s = 5;\ns = s * 2;', q: '¿Compila?', opts: ['Compila', NC], a: 1, why: 's * 2 es int, y sin operador compuesto no hay cast implícito.' },
      { code: 'int x = 7;\nx /= 2;\nSystem.out.println(x);', opts: ['3', '3.5', '4', 'Compilation fails'], a: 0, why: 'x = x / 2 en enteros = 3.' },
      { code: 'int x = 10;\nx =- 3;\nSystem.out.println(x);', opts: ['-3', '7', '13', 'Compilation fails'], a: 0, why: '=- no es un operador: es x = -3.' },
      { code: 'int x = 3;\nx += x++ + x;\nSystem.out.println(x);', opts: ['10', '11', '9', '7'], a: 0, why: 'Se guarda x = 3. x++ vale 3 (x = 4), luego x vale 4: 3 + 4 = 7. x = 3 + 7 = 10.' },
      { code: 'int a, b, c;\na = b = c = 4;\na += b -= c *= 2;\nSystem.out.println(a + " " + b + " " + c);', opts: ['0 -4 8', '4 -4 8', '0 4 8', 'Compilation fails'], a: 0, why: 'De derecha a izquierda: c = 8; b = 4 - 8 = -4; a = 4 + (-4) = 0.' },
      { code: "char c = 'A';\nc += 1.7;\nSystem.out.println(c);", opts: ['B', 'C', '66', NC], a: 0, why: "c = (char)(65 + 1.7) = (char) 66.7 = 66 = 'B'." },
      { code: 'int x = 5;\nSystem.out.println(x = 8);', opts: ['8', '5', 'true', 'Compilation fails'], a: 0, why: 'Una asignación es una expresión que vale el valor asignado.' },
      { code: 'long l = 10;\nint i = 2;\ni += l;\nSystem.out.println(i);', opts: ['12', NC, '12L'], a: 0, why: 'i += l ≡ i = (int)(i + l): el cast oculto hace que compile.' }
    ],
    ternario: [
      { code: 'int x = 10;\nString r = x > 5 ? "A" : "B";\nSystem.out.println(r);', opts: ['A', 'B', 'Compilation fails'], a: 0, why: '10 > 5 es true → primera rama.' },
      { code: "System.out.println(false ? 1 : 'B');", opts: ['B', '66', '1', 'Compilation fails'], a: 0, why: "1 es una constante int que cabe en char → el ternario es de tipo char → imprime 'B'." },
      { code: "int i = 66;\nSystem.out.println(false ? i : 'B');", opts: ['66', 'B', 'Compilation fails'], a: 0, why: 'i NO es constante → promoción a int: el char B se imprime como 66.' },
      { code: 'int x = 4;\nint y = x < 5 ? x++ : x--;\nSystem.out.println(x + " " + y);', opts: ['5 4', '5 5', '3 4', '4 4'], a: 0, why: 'Solo se ejecuta la primera rama: x++ vale 4 y x pasa a 5.' },
      { code: 'System.out.println(true ? 3 : 4.5);', opts: ['3.0', '3', '4.5', 'Compilation fails'], a: 0, why: 'El tipo del ternario combina int y double → double.' },
      { code: 'int n = 7;\nString r = n % 2 == 0 ? "par" : n > 5 ? "impar grande" : "impar";\nSystem.out.println(r);', opts: ['impar grande', 'impar', 'par', 'Compilation fails'], a: 0, why: '7 % 2 == 0 es false → se evalúa n > 5 ? ... → true → "impar grande".' },
      { code: 'int x = 1;\nint y = x > 0 ? 10 : "diez";', q: '¿Compila?', opts: ['Sí, y vale 10', NC], a: 1, why: 'Una rama es int y otra String: el ternario no es de tipo int, aunque se elija la rama del 10.' },
      { code: 'int x = 5;\nint r = x ? 1 : 0;', q: '¿Compila?', opts: ['Sí, r vale 1', 'Sí, r vale 0', NC], a: 2, why: 'La condición debe ser boolean: un int no sirve.' }
    ],
    promocion: [
      { q: 'Si `a` es `short` y `b` es `char`, ¿qué tipo tiene `a + b`?', opts: ['[[short]]', '[[char]]', '[[int]]', '[[long]]'], a: 2, why: 'Regla 3: short y char suben a int.' },
      { q: 'Si `x` es `long` e `y` es `float`, ¿qué tipo tiene `x * y`?', opts: ['[[long]]', '[[float]]', '[[double]]', 'No compila'], a: 1, why: 'Regla 2: entero con punto flotante → el entero se vuelve float.' },
      { q: 'Si `b` es `byte`, ¿qué tipo tiene `-b`?', opts: ['[[byte]]', '[[int]]', '[[short]]', 'No compila'], a: 1, why: 'Los unarios + y - también promueven byte/short/char a int.' },
      { code: 'byte a = 3, b = 4;\nbyte c = a * b;', q: '¿Compila?', opts: ['Sí, c vale 12', NC], a: 1, why: 'a * b es int y a, b no son constantes.' },
      { code: 'short a = 10;\nshort b = (short) a + 5;', q: '¿Compila?', opts: ['Compila', NC], a: 1, why: 'El cast solo afecta a a; (short) a + 5 vuelve a ser int. Hace falta (short)(a + 5).' },
      { code: 'int i = 5;\ndouble d = 2;\nvar r = i / d;\nSystem.out.println(r);', opts: ['2.5', '2', '2.0', 'Compilation fails'], a: 0, why: 'i se promueve a double: 5.0 / 2.0 = 2.5.' },
      { code: "char c = 'a';\nint i = c + 1;\nSystem.out.println(i);", opts: ['98', 'b', 'a1', 'Compilation fails'], a: 0, why: "char + int = int: 97 + 1 = 98." },
      { code: 'float f = 2.5f;\nlong l = 2;\nSystem.out.println(f * l);', opts: ['5.0', '5', 'Compilation fails', '5.0f'], a: 0, why: 'long se promueve a float: 2.5f * 2.0f = 5.0.' },
      { q: '¿Qué regla hace que `byte + byte` sea `int`?', opts: ['Regla 1: el menor sube al mayor', 'Regla 2: entero con decimal', 'Regla 3: byte/short/char siempre suben a int', 'No es int, es byte'], a: 2, why: 'La regla 3 aplica aunque ninguno de los dos sea int.' },
      { code: 'short s = 1;\nlong l = 2;\nfloat f = 3;\ndouble d = s + l + f;\nSystem.out.println(d);', opts: ['6.0', '6', 'Compilation fails', '6.0f'], a: 0, why: 's + l = long 3; 3 + f = float 6.0; float → double al asignar.' }
    ],
    casting: [
      { code: 'System.out.println((byte) 140);', opts: ['-116', '140', '116', '-128'], a: 0, why: '140 no cabe en byte: 140 - 256 = -116 (se conservan los 8 bits bajos).' },
      { code: 'System.out.println((int) 7.99 + (int) -7.99);', opts: ['0', '1', '-1', '15'], a: 0, why: 'Truncar hacia cero: 7 + (-7) = 0.' },
      { code: 'System.out.println((short) 32768);', opts: ['-32768', '32768', '32767', 'Compilation fails'], a: 0, why: '32768 es 1 más que el máximo de short: da la vuelta al mínimo.' },
      { code: 'System.out.println((char) 97);', opts: ['a', '97', 'A', 'Compilation fails'], a: 0, why: "97 es el código de 'a'." },
      { code: 'int i = 100;\nbyte b = i;', q: '¿Compila?', opts: ['Compila', NC], a: 1, why: 'i no es final, así que no es una constante: int → byte requiere cast.' },
      { code: 'final int i = 100;\nbyte b = i;\nSystem.out.println(b);', opts: ['100', NC, '-100'], a: 0, why: 'i es final con valor constante 100, que cabe en byte.' },
      { code: 'byte b = 100L;', q: '¿Compila?', opts: ['Compila', NC], a: 1, why: 'La excepción de constantes no incluye long.' },
      { code: 'long l = 50;\nfloat f = l;\nSystem.out.println(f);', opts: ['50.0', '50', NC], a: 0, why: 'long → float es ampliación implícita.' },
      { q: '¿Cuál necesita cast explícito?', opts: ['`int → long`', '`char → int`', '`short → char`', '`float → double`'], a: 2, why: 'short tiene negativos y char no: necesitan cast en ambas direcciones.' },
      { code: "System.out.println((int) 'a' + (char) 1);", opts: ['98', 'a1', 'b', 'Compilation fails'], a: 0, why: 'int + char = int: 97 + 1 = 98.' },
      { code: 'System.out.println((byte) 1000);', opts: ['-24', '1000', '232', '-128'], a: 0, why: '1000 = 0x3E8. Los 8 bits bajos son 0xE8 = 232, que en byte con signo es 232 - 256 = -24.' }
    ],
    trampas: [
      { code: 'System.out.println(1 + 2 + "" + 1 + 2);', opts: ['312', '3012', '12312', '6'], a: 0, why: '1 + 2 = 3; "3" + 1 = "31"; "31" + 2 = "312".' },
      { code: 'long n = 1000 * 1000 * 1000 * 10;\nSystem.out.println(n);', opts: ['10000000000', '1410065408', 'Compilation fails'], a: 1, why: 'Todo es int: la multiplicación desborda antes de asignarse al long.' },
      { code: 'int x = 5;\nx = x++;\nx = ++x;\nSystem.out.println(x);', opts: ['6', '7', '5', 'Compilation fails'], a: 0, why: 'x = x++ deja x en 5; x = ++x lo deja en 6.' },
      { code: 'short s = 10;\ns += 100000;\nSystem.out.println(s);', opts: ['-31062', '100010', NC, '34474'], a: 0, why: '+= compila por el cast oculto: (short) 100010 = 100010 - 65536 × 2 = -31062.' },
      { code: 'int x;\nx++;', q: '¿Compila?', opts: ['Sí, x vale 1', NC], a: 1, why: 'x++ primero lee x, y una variable local no tiene valor por defecto.' },
      { code: "String s = 'a' + 'b' + \"\";\nSystem.out.println(s);", opts: ['195', 'ab', 'Compilation fails', '97b'], a: 0, why: "Izquierda a derecha: 'a' + 'b' = 195 (int), luego + \"\" = \"195\"." },
      { code: 'double d = 1 / 2;\nSystem.out.println(d);', opts: ['0.0', '0.5', '0', 'Compilation fails'], a: 0, why: '1 / 2 se calcula en int (0) y luego se amplía a 0.0.' },
      { code: "System.out.println((char) ('a' + 2));", opts: ['c', '99', 'a2', 'Compilation fails'], a: 0, why: "'a' + 2 = 99 (int), y el cast a char da 'c'." },
      { code: 'int i = 10;\ni = i++ + i--;\nSystem.out.println(i);', opts: ['21', '20', '22', '19'], a: 0, why: 'i++ vale 10 (i = 11); i-- vale 11 (i = 10); 10 + 11 = 21 se asigna a i.' }
    ]
  };

  // ───────── Retos de código: el alumno escribe Java y el motor lo valida ─────────
  // { task, starter, solution, expect (salida exacta), must/mustNot: [[regex, requisito]], vars: {id: tipo},
  //   noLiteral (prohíbe imprimir el resultado escrito a mano), hint, why }
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // regex que acepta la expresión dada añadiendo SOLO paréntesis y espacios
  const onlyParens = (decl, expr) => '\\b' + decl.split(/\s+/).map(rx).join('\\s+') + '\\s*=' + expr.replace(/\s+/g, '').split('').map(c => '[\\s()]*' + rx(c)).join('') + '[\\s()]*;';

  const CHALLENGES = {
    tipos: [
      { task: 'Declara `byte b` con el valor máximo de byte usando la constante `Byte.MAX_VALUE`. Después declara `int r = b + 1;` e imprime `r`.', starter: '// Escribe tu código aquí\n', solution: 'byte b = Byte.MAX_VALUE;\nint r = b + 1;\nSystem.out.println(r);', expect: '128', must: [['Byte\\.MAX_VALUE', 'Usa `Byte.MAX_VALUE`']], vars: { b: 'byte', r: 'int' }, noLiteral: true, hint: 'b + 1 se calcula en int, así que no hay overflow.', why: 'byte + int = int: 127 + 1 = 128 cabe sin problema en int.' },
      { task: 'Completa las declaraciones: un `char` con la letra **Z**, un `long` con **5 mil millones** y un `float` con **2.5**. No cambies el println.', starter: 'char c = ;\nlong l = ;\nfloat f = ;\nSystem.out.println(c + " " + l + " " + f);', solution: "char c = 'Z';\nlong l = 5_000_000_000L;\nfloat f = 2.5f;\nSystem.out.println(c + \" \" + l + \" \" + f);", expect: 'Z 5000000000 2.5', vars: { c: 'char', l: 'long', f: 'float' }, hint: 'char lleva comillas simples, long necesita L y float necesita f.', why: "'Z' es un literal char; 5000000000 no cabe en int, así que necesita L; 2.5 es double, así que necesita f." }
    ],
    literales: [
      { task: 'Guarda el número **255** en tres variables `int`: una escrita en **hexadecimal**, otra en **binario** y otra en **octal**. Imprime su suma (765). No puedes escribir 255 en decimal.', starter: 'int h = ;\nint b = ;\nint o = ;\nSystem.out.println(h + b + o);', solution: 'int h = 0xFF;\nint b = 0b1111_1111;\nint o = 0377;\nSystem.out.println(h + b + o);', expect: '765', must: [['0[xX][0-9a-fA-F_]+', 'Usa un literal hexadecimal (`0x…`)'], ['0[bB][01_]+', 'Usa un literal binario (`0b…`)'], ['(^|[^\\w.])0[0-7_]*[0-7]\\b', 'Usa un literal octal (empieza por `0`)']], mustNot: [['(^|[^\\w.])255\\b', 'Sin escribir `255` en decimal']], noLiteral: true, hint: '255 = FF en hexadecimal = 11111111 en binario = 377 en octal.', why: '0xFF, 0b11111111 y 0377 son tres formas de escribir el mismo int 255.' },
      { task: 'Este código **no compila**. Arréglalo y, de paso, escribe el número con **guiones bajos** para que se lea fácil.', starter: 'long poblacion = 8000000000;\nSystem.out.println(poblacion);', solution: 'long poblacion = 8_000_000_000L;\nSystem.out.println(poblacion);', expect: '8000000000', must: [['_', 'Usa guiones bajos en el literal']], vars: { poblacion: 'long' }, hint: 'El literal es int aunque la variable sea long.', why: 'Sin L el literal es int y no cabe. Con L ya es long; los _ entre dígitos son válidos.' }
    ],
    precedencia: [
      { task: 'Agrega **solo paréntesis** (sin cambiar números ni operadores) para que `r` valga **19**.', starter: 'int r = 2 + 3 * 4 - 1;\nSystem.out.println(r);', solution: 'int r = (2 + 3) * 4 - 1;\nSystem.out.println(r);', expect: '19', must: [[onlyParens('int r', '2 + 3 * 4 - 1'), 'Solo añade paréntesis a `2 + 3 * 4 - 1`']], hint: 'Sin paréntesis vale 13 porque * va primero. ¿Qué suma necesitas hacer antes?', why: '(2 + 3) * 4 - 1 = 20 - 1 = 19.' },
      { task: 'Agrega **solo paréntesis** para que `r` valga **9**.', starter: 'int r = 10 - 4 - 3;\nSystem.out.println(r);', solution: 'int r = 10 - (4 - 3);\nSystem.out.println(r);', expect: '9', must: [[onlyParens('int r', '10 - 4 - 3'), 'Solo añade paréntesis a `10 - 4 - 3`']], hint: 'La resta se asocia de izquierda a derecha: (10 - 4) - 3 = 3.', why: 'Agrupar a la derecha cambia el resultado: 10 - (4 - 3) = 10 - 1 = 9.' },
      { task: 'Sin escribir números nuevos, usa `i` y `++` para que `r` valga **7** (1 + 2 * 3), con `i` empezando en 1.', starter: 'int i = 1;\nint r = ;\nSystem.out.println(r);', solution: 'int i = 1;\nint r = i++ + i++ * i++;\nSystem.out.println(r);', expect: '7', must: [['int\\s+r\\s*=[^;0-9]*;', 'La línea de `r` no usa números'], ['\\+\\+', 'Usa `++`']], hint: 'Los operandos se evalúan de izquierda a derecha: el primer i++ vale 1, el segundo 2, el tercero 3.', why: 'i++ + i++ * i++ = 1 + 2 * 3 = 7: primero se leen los operandos en orden y después se aplica la precedencia.' }
    ],
    aritmeticos: [
      { task: 'Hay 17 personas y caben 5 por coche. Imprime cuántos coches se llenan **completos** y cuántas personas **sobran**, en el formato `3 2`.', starter: 'int total = 17;\nint porCoche = 5;\n// imprime: llenos sobran\n', solution: 'int total = 17;\nint porCoche = 5;\nSystem.out.println(total / porCoche + " " + total % porCoche);', expect: '3 2', must: [['/', 'Usa `/`'], ['%', 'Usa `%`']], noLiteral: true, hint: '/ entre enteros da el cociente y % da el resto.', why: '17 / 5 = 3 (división entera) y 17 % 5 = 2 (resto).' },
      { task: 'Sin cambiar la declaración, haz que se imprima la división **exacta** de a entre b: **3.5**.', starter: 'int a = 7, b = 2;\nSystem.out.println(a / b);', solution: 'int a = 7, b = 2;\nSystem.out.println((double) a / b);', expect: '3.5', must: [['int\\s+a\\s*=\\s*7\\s*,\\s*b\\s*=\\s*2\\s*;', 'No cambies `int a = 7, b = 2;`']], noLiteral: true, hint: 'Si uno de los operandos es double, la división deja de ser entera.', why: '(double) a / b: el cast va primero → 7.0 / 2 → 3.5. Ojo: (double)(a / b) daría 3.0.' },
      { task: 'Este código debería imprimir **3000000000** pero sale un número negativo. Arréglalo cambiando lo mínimo.', starter: 'int a = 1500000000;\nlong r = a * 2;\nSystem.out.println(r);', solution: 'int a = 1500000000;\nlong r = a * 2L;\nSystem.out.println(r);', expect: '3000000000', mustNot: [['3000000000', 'Sin escribir el resultado a mano']], hint: 'a * 2 se calcula en int y desborda ANTES de guardarse en el long.', why: 'Con 2L (o (long) a) la multiplicación se hace en long y no desborda.' }
    ],
    incrementos: [
      { task: 'Escribe la línea de `y` usando solo `x`, `++`/`--` y `+` (sin números) para que se imprima `6 11`.', starter: 'int x = 5;\nint y = ;\nSystem.out.println(x + " " + y);', solution: 'int x = 5;\nint y = x++ + x;\nSystem.out.println(x + " " + y);', expect: '6 11', must: [['int\\s+y\\s*=[^;0-9]*;', 'La línea de `y` no usa números'], ['\\+\\+|--', 'Usa `++` o `--`']], hint: 'Necesitas 5 + 6. ¿Qué devuelve x++ y cuánto vale x justo después?', why: 'x++ vale 5 y deja x = 6; luego + x suma 6 → 11.' },
      { task: 'Haz que `b` termine valiendo **-128** sin escribir `-128` y sin usar cast.', starter: 'byte b = 127;\n// tu código aquí\nSystem.out.println(b);', solution: 'byte b = 127;\nb++;\nSystem.out.println(b);', expect: '-128', mustNot: [['128', 'Sin escribir `128`'], ['\\(\\s*byte\\s*\\)', 'Sin cast `(byte)`']], hint: '++ sobre un byte lleva un cast implícito…', why: 'b++ ≡ b = (byte)(b + 1): 128 no cabe y da la vuelta a -128.' }
    ],
    relacionales: [
      { task: 'Declara `y` como **double** sin escribir el número 65, de forma que `x == y` sea **true**.', starter: "char x = 'A';\ndouble y = ;\nSystem.out.println(x == y);", solution: "char x = 'A';\ndouble y = 'A';\nSystem.out.println(x == y);", expect: 'true', vars: { y: 'double' }, mustNot: [['\\b65', 'Sin escribir 65']], hint: 'Un char se puede guardar en un double sin cast (ampliación).', why: "char → double es ampliación: y vale 65.0. Al comparar, x también se promueve a double: 65.0 == 65.0." },
      { task: 'Declara `y` como **char** de forma que `x == y` sea **true**.', starter: 'int x = 65;\nchar y = ;\nSystem.out.println(x == y);', solution: "int x = 65;\nchar y = 'A';\nSystem.out.println(x == y);", expect: 'true', vars: { y: 'char' }, mustNot: [['\\(\\s*char\\s*\\)', 'Sin cast']], hint: '¿Qué letra tiene el código 65?', why: "Al comparar, el char 'A' se promueve a int 65." }
    ],
    logicos: [
      { task: 'Este código lanza `ArithmeticException`. Cambia **un solo operador** para que imprima `false` sin error.', starter: 'int d = 0;\nboolean ok = d != 0 & 10 / d > 1;\nSystem.out.println(ok);', solution: 'int d = 0;\nboolean ok = d != 0 && 10 / d > 1;\nSystem.out.println(ok);', expect: 'false', must: [['&&', 'Usa el operador con cortocircuito']], hint: '¿Qué operador deja de evaluar el lado derecho cuando el izquierdo ya es false?', why: 'Con && el lado derecho no se evalúa si el izquierdo es false: la división nunca ocurre.' },
      { task: 'Escribe la línea de `r` con `n++` **dos veces** (una a cada lado de un operador lógico) para que se imprima `1 true`.', starter: 'int n = 0;\nboolean r = ;\nSystem.out.println(n + " " + r);', solution: 'int n = 0;\nboolean r = n++ == 0 || n++ == 0;\nSystem.out.println(n + " " + r);', expect: '1 true', must: [['n\\+\\+[\\s\\S]*n\\+\\+', 'Usa `n++` dos veces']], hint: 'Si n termina en 1, el segundo n++ nunca se ejecutó: necesitas cortocircuito.', why: 'n++ == 0 es true → || hace cortocircuito y el segundo n++ no corre.' }
    ],
    bits: [
      { task: 'Calcula `x * 8` **sin usar** `*`: usa un desplazamiento.', starter: 'int x = 5;\nint r = x * 8;\nSystem.out.println(r);', solution: 'int x = 5;\nint r = x << 3;\nSystem.out.println(r);', expect: '40', must: [['<<', 'Usa `<<`']], mustNot: [['\\*', 'Sin usar `*`']], noLiteral: true, hint: '8 = 2³.', why: 'x << n multiplica por 2ⁿ: 5 << 3 = 40.' },
      { task: 'Comprueba si `n` es par usando `&` (sin `%`).', starter: 'int n = 14;\nboolean par = ;\nSystem.out.println(par);', solution: 'int n = 14;\nboolean par = (n & 1) == 0;\nSystem.out.println(par);', expect: 'true', must: [['&', 'Usa `&`']], mustNot: [['%', 'Sin usar `%`']], hint: 'Un número es par si su último bit es 0. Ojo: == tiene más precedencia que &.', why: '(n & 1) se queda con el último bit; si es 0, n es par. Sin paréntesis, n & 1 == 0 no compila.' }
    ],
    asignacion: [
      { task: 'Este código **no compila**. Arréglalo **sin escribir un cast**, usando un operador compuesto.', starter: 'short s = 10;\ns = s + 5;\nSystem.out.println(s);', solution: 'short s = 10;\ns += 5;\nSystem.out.println(s);', expect: '15', must: [['\\+=', 'Usa `+=`']], mustNot: [['\\(\\s*short\\s*\\)', 'Sin cast `(short)`']], hint: 'Los operadores compuestos llevan un cast escondido.', why: 's += 5 ≡ s = (short)(s + 5).' },
      { task: 'En **una sola sentencia** de asignaciones encadenadas, haz que a, b y c valgan 0.', starter: 'int a = 3, b = 4, c = 5;\n// una sola línea\nSystem.out.println(a + " " + b + " " + c);', solution: 'int a = 3, b = 4, c = 5;\na = b = c = 0;\nSystem.out.println(a + " " + b + " " + c);', expect: '0 0 0', must: [['\\b\\w+\\s*=\\s*\\w+\\s*=\\s*\\w+\\s*=\\s*0\\s*;', 'Encadena: `a = b = c = 0;`']], hint: 'La asignación devuelve el valor asignado y se agrupa de derecha a izquierda.', why: 'a = (b = (c = 0)).' },
      { task: 'Usa `*=` para que `i` termine en **25** (empieza en 10). Pista: el compuesto acepta un double.', starter: 'int i = 10;\n// tu código\nSystem.out.println(i);', solution: 'int i = 10;\ni *= 2.5;\nSystem.out.println(i);', expect: '25', must: [['\\*=', 'Usa `*=`']], hint: '10 × 2.5 = 25.0, y el cast oculto lo convierte a int.', why: 'i *= 2.5 ≡ i = (int)(10 * 2.5) = 25. Escrito como i = i * 2.5 no compilaría.' }
    ],
    ternario: [
      { task: 'Usa el **operador ternario** para que `r` sea `"aprobado"` si `nota >= 70` o `"reprobado"` si no.', starter: 'int nota = 72;\nString r = ;\nSystem.out.println(r);', solution: 'int nota = 72;\nString r = nota >= 70 ? "aprobado" : "reprobado";\nSystem.out.println(r);', expect: 'aprobado', must: [['\\?[^;]*:', 'Usa `? :`'], ['reprobado', 'Contempla también el caso "reprobado"']], hint: 'condición ? valorSiTrue : valorSiFalse', why: '72 >= 70 es true → se elige la primera rama.' },
      { task: 'Calcula el **valor absoluto** de `n` con un ternario (sin `Math`).', starter: 'int n = -5;\nint abs = ;\nSystem.out.println(abs);', solution: 'int n = -5;\nint abs = n < 0 ? -n : n;\nSystem.out.println(abs);', expect: '5', must: [['\\?[^;]*:', 'Usa `? :`'], ['int\\s+abs\\s*=[^;]*\\bn\\b', 'Calcula `abs` a partir de `n`']], mustNot: [['Math', 'Sin `Math`'], ['int\\s+abs\\s*=\\s*5\\s*;', 'Sin escribir 5 a mano']], hint: 'Si es negativo, cámbiale el signo.', why: 'n < 0 es true → -n = 5.' }
    ],
    promocion: [
      { task: 'Este código **no compila**. Arréglalo con un cast **bien colocado** (ojo con los paréntesis).', starter: 'byte a = 100;\nbyte b = 27;\nbyte c = a + b;\nSystem.out.println(c);', solution: 'byte a = 100;\nbyte b = 27;\nbyte c = (byte) (a + b);\nSystem.out.println(c);', expect: '127', must: [['\\(\\s*byte\\s*\\)\\s*\\(', 'Castea la suma completa: `(byte) (a + b)`']], vars: { c: 'byte' }, hint: 'a + b es int (regla 3). (byte) a + b solo castea a a.', why: 'El cast debe envolver toda la suma, porque tiene más precedencia que +.' },
      { task: 'Declara `x` e `y` (tú eliges los tipos, **ninguno double**) para que `var r = x + y;` sea **float** y se imprima `3.5`.', starter: '// declara x e y\n\nvar r = x + y;\nSystem.out.println(r);', solution: 'int x = 1;\nfloat y = 2.5f;\nvar r = x + y;\nSystem.out.println(r);', expect: '3.5', vars: { r: 'float' }, mustNot: [['\\bdouble\\b', 'Sin usar double']], hint: 'Entero + float → float (regla 2).', why: 'int + float = float: el int se promueve.' },
      { task: 'Declara `b` para que `var r = a + b;` sea de tipo **long** y se imprima `3`.', starter: 'byte a = 1;\n// declara b\n\nvar r = a + b;\nSystem.out.println(r);', solution: 'byte a = 1;\nlong b = 2;\nvar r = a + b;\nSystem.out.println(r);', expect: '3', vars: { r: 'long' }, hint: 'El resultado toma el tipo más grande (regla 1).', why: 'byte + long → long.' }
    ],
    casting: [
      { task: 'Convierte `i` a byte para que compile. ¿Qué se imprime? Compruébalo.', starter: 'int i = 200;\nbyte b = i;\nSystem.out.println(b);', solution: 'int i = 200;\nbyte b = (byte) i;\nSystem.out.println(b);', expect: '-56', must: [['\\(\\s*byte\\s*\\)', 'Usa `(byte)`']], vars: { b: 'byte' }, noLiteral: true, hint: 'Estrechar necesita cast explícito.', why: '200 no cabe en byte: se conservan los 8 bits bajos → 200 - 256 = -56.' },
      { task: 'Separa `precio` en parte entera y centavos usando casts, para imprimir `19 75`.', starter: 'double precio = 19.75;\nint entero = ;\nint centavos = ;\nSystem.out.println(entero + " " + centavos);', solution: 'double precio = 19.75;\nint entero = (int) precio;\nint centavos = (int) (precio * 100) % 100;\nSystem.out.println(entero + " " + centavos);', expect: '19 75', must: [['\\(\\s*int\\s*\\)', 'Usa `(int)`']], mustNot: [['=\\s*19\\s*;', 'Sin escribir 19 a mano'], ['=\\s*75\\s*;', 'Sin escribir 75 a mano']], vars: { entero: 'int', centavos: 'int' }, hint: '(int) trunca. Para los centavos multiplica por 100 y quédate con el resto de dividir entre 100.', why: '(int) 19.75 = 19; (int)(1975.0) % 100 = 75.' },
      { task: 'Haz que compile **sin cast**: cambia solo la declaración de `k`.', starter: 'int k = 100;\nbyte b = k;\nSystem.out.println(b);', solution: 'final int k = 100;\nbyte b = k;\nSystem.out.println(b);', expect: '100', must: [['final', 'Usa `final`']], mustNot: [['\\(\\s*byte\\s*\\)', 'Sin cast']], hint: 'La excepción de las constantes de compilación…', why: 'final int k = 100 es una constante que cabe en byte → asignación implícita permitida.' }
    ],
    trampas: [
      { task: 'Este código imprime `Total: 12`. Arréglalo para que imprima `Total: 3`, manteniendo la suma `1 + 2` en el código.', starter: 'System.out.println("Total: " + 1 + 2);', solution: 'System.out.println("Total: " + (1 + 2));', expect: 'Total: 3', must: [['1\\s*\\+\\s*2', 'Mantén `1 + 2`']], noLiteral: true, hint: 'Con un String a la izquierda, todo lo que sigue se concatena.', why: 'Los paréntesis fuerzan la suma numérica antes de concatenar.' },
      { task: 'Arregla el overflow: debe imprimir los microsegundos de un día, **86400000000**.', starter: 'long us = 24 * 60 * 60 * 1000 * 1000;\nSystem.out.println(us);', solution: 'long us = 24L * 60 * 60 * 1000 * 1000;\nSystem.out.println(us);', expect: '86400000000', mustNot: [['86400000000', 'Sin escribir el resultado a mano']], hint: 'Haz que la PRIMERA multiplicación ya sea long.', why: 'Con 24L todo se calcula en long desde el principio.' },
      { task: "Haz que `c` pase a ser `'d'` **sin cast** y sin escribir `'d'`.", starter: "char c = 'a';\n// tu código\nSystem.out.println(c);", solution: "char c = 'a';\nc += 3;\nSystem.out.println(c);", expect: 'd', mustNot: [["'d'", "Sin escribir 'd'"], ['\\(\\s*char\\s*\\)', 'Sin cast'], ['\\b100\\b', 'Sin escribir 100']], hint: "c + 3 sería int; ¿qué operador lleva cast escondido?", why: "c += 3 ≡ c = (char)(c + 3): 'a' + 3 = 'd'." }
    ]
  };

  const strip = code => code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  // Requisitos visibles de un reto (sin ejecutar)
  function requirements(ch) {
    const reqs = [{ key: 'compile', text: 'Compila y se ejecuta sin errores' }];
    if (ch.expect !== undefined) reqs.push({ key: 'out', text: `Imprime exactamente: \`${ch.expect}\`` });
    for (const [id, t] of Object.entries(ch.vars || {})) reqs.push({ key: 'var:' + id, text: `\`${id}\` es de tipo [[${t}]]` });
    (ch.must || []).forEach(([, m], i) => reqs.push({ key: 'must' + i, text: m }));
    (ch.mustNot || []).forEach(([, m], i) => reqs.push({ key: 'not' + i, text: m }));
    if (ch.noLiteral) reqs.push({ key: 'lit', text: 'Sin imprimir el resultado escrito a mano' });
    return reqs;
  }
  // Ejecuta el código del alumno y evalúa cada requisito
  function check(ch, code) {
    const J = (typeof window !== 'undefined' && window.JavaEngine) || globalThis.JavaEngine;
    const res = J.run(code);
    const src = strip(code);
    const reqs = requirements(ch).map(r => {
      let ok;
      if (r.key === 'compile') ok = res.ok;
      else if (r.key === 'out') ok = res.ok && res.out.trimEnd() === ch.expect;
      else if (r.key.startsWith('var:')) { const id = r.key.slice(4); const v = (res.vars || []).filter(x => x.id === id).pop(); ok = !!v && v.type === ch.vars[id]; }
      else if (r.key.startsWith('must')) ok = new RegExp(ch.must[+r.key.slice(4)][0], 'm').test(src);
      else if (r.key.startsWith('not')) ok = !new RegExp(ch.mustNot[+r.key.slice(3)][0], 'm').test(src);
      else if (r.key === 'lit') ok = !new RegExp('println\\s*\\(\\s*' + rx(JSON.stringify(ch.expect)) + '\\s*\\)|println\\s*\\(\\s*' + rx(ch.expect) + '[lLfFdD]?\\s*\\)').test(src);
      return { ...r, ok };
    });
    return { ok: reqs.every(r => r.ok), reqs, res };
  }

  // Cada reto conoce su sección (para el desglose del examen)
  for (const [sec, list] of Object.entries(CHALLENGES)) list.forEach(c => { c.type = 'code'; c.sec = sec; });

  window.TOPICS.ops.QUIZ = QUIZ;
  window.TOPICS.ops.CHALLENGES = CHALLENGES;
  window.Challenge = { check, requirements };
  if (typeof module !== 'undefined') module.exports = { QUIZ, CHALLENGES, check, requirements };
})();
