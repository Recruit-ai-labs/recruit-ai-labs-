#!/usr/bin/env sh
set -eu

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

BASE_FILE="scripts/protected-base-commit.txt"
DIFF_HASH_FILE="scripts/protected-baseline-diff.hash"
TREE_HASH_FILE="scripts/protected-baseline-tree.hash"

for required in PROTECTED_PATHS.txt "$BASE_FILE" "$DIFF_HASH_FILE" "$TREE_HASH_FILE"; do
  if [ ! -f "$required" ]; then
    echo "Protected-zone check failed: missing $required" >&2
    exit 2
  fi
done

BASE="$(tr -d '\r\n' < "$BASE_FILE")"
EXPECTED_DIFF_HASH="$(tr -d '\r\n' < "$DIFF_HASH_FILE")"

set --
while IFS= read -r path || [ -n "$path" ]; do
  path="$(printf '%s' "$path" | tr -d '\r')"
  case "$path" in
    ''|'#'*) continue ;;
  esac
  set -- "$@" "$path"
done < PROTECTED_PATHS.txt

CURRENT_DIFF_HASH="$(git diff --binary --no-ext-diff "$BASE" -- "$@" | git hash-object --stdin)"
if [ "$CURRENT_DIFF_HASH" != "$EXPECTED_DIFF_HASH" ]; then
  echo "Protected-zone check failed: tracked protected changes differ from the recorded baseline." >&2
  echo "Current protected diff hash: $CURRENT_DIFF_HASH" >&2
  git diff --stat "$BASE" -- "$@" >&2
  exit 1
fi

EXPECTED_TREE_HASH="$(tr -d '\r\n' < "$TREE_HASH_FILE")"
CURRENT_TREE_HASH="$({
  git ls-files --cached --others --exclude-standard -- "$@" | sort | while IFS= read -r file; do
    if [ -f "$file" ]; then
      printf '%s\n' "$file"
      git hash-object "$file"
    fi
  done
} | git hash-object --stdin)"
if [ "$CURRENT_TREE_HASH" != "$EXPECTED_TREE_HASH" ]; then
  echo "Protected-zone check failed: protected file contents or file list changed." >&2
  echo "Current protected tree hash: $CURRENT_TREE_HASH" >&2
  exit 1
fi

echo "Protected-zone check passed (baseline $BASE)."
