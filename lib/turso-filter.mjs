// Translate the supported PocketBase filter grammar without dropping conditions.
export function compileTursoFilter(filter = '') {
  let position = 0;
  const input = String(filter);
  const args = [];
  const whitespace = () => { while (/\s/.test(input[position] || '') && position < input.length) position++; };
  const take = value => { whitespace(); if (!input.startsWith(value, position)) return false; position += value.length; return true; };
  const invalid = () => { throw new Error('Unsupported or invalid database filter.'); };
  function comparison() {
    whitespace();
    const field = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(input.slice(position));
    if (!field) return invalid();
    position += field[0].length;
    whitespace();
    const operator = /^(>=|<=|!=|!~|=|>|<|~)/.exec(input.slice(position));
    if (!operator) return invalid();
    position += operator[0].length;
    if (!take('"')) return invalid();
    let value = '', closed = false;
    while (position < input.length) {
      const character = input[position++];
      if (character === '"') { closed = true; break; }
      if (character === '\\') {
        const escaped = input[position++];
        if (escaped !== '"' && escaped !== '\\') return invalid();
        value += escaped;
      } else value += character;
    }
    if (!closed) return invalid();
    const column = `"${field[0]}"`;
    if (operator[0].includes('~')) {
      args.push('%' + value.replace(/[\\%_]/g, '\\$&') + '%');
      return `${column} ${operator[0] === '!~' ? 'NOT LIKE' : 'LIKE'} ? ESCAPE '\\'`;
    }
    args.push(value);
    // ISO timestamps may use T or a space; SQLite normalizes both for comparison.
    if (['>', '<', '>=', '<='].includes(operator[0]) && /^\d{4}-\d\d-\d\d[ T]/.test(value)) {
      return `julianday(${column}) ${operator[0]} julianday(?)`;
    }
    return `${column} ${operator[0]} ?`;
  }
  function primary() {
    if (!take('(')) return comparison();
    const result = or();
    if (!take(')')) return invalid();
    return `(${result})`;
  }
  function and() { let result = primary(); while (take('&&')) result += ` AND ${primary()}`; return result; }
  function or() { let result = and(); while (take('||')) result += ` OR ${and()}`; return result; }
  whitespace();
  if (position === input.length) return { where: '', args };
  const sql = or();
  whitespace();
  if (position !== input.length) return invalid();
  return { where: ` WHERE ${sql}`, args };
}
