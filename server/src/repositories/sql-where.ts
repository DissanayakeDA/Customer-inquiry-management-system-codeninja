/**
 * Builds a parameterised WHERE clause. Values are only ever passed as $n parameters,
 * never concatenated into SQL, so user input cannot change the query.
 */
export class SqlWhere {
  private readonly conditions: string[] = [];
  readonly params: unknown[] = [];

  /** Registers a parameter value and returns its placeholder ($1, $2, ...). */
  param(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  and(condition: string): this {
    this.conditions.push(condition);
    return this;
  }

  toSql(): string {
    return this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }
}

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
