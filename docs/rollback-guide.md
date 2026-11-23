# Rollback guide — undoing a PhoneBook import

Keep this next to you when importing. Total time: 2 minutes.

## Before you import (the 30-second safety net)

1. Open [contacts.google.com](https://contacts.google.com) on your computer.
2. On the Contacts list screen, use the **Export** control — look for the **upward-arrow button**
   at the top of your contacts list (older layouts have Export in the left sidebar).
3. Choose **All contacts** → format **vCard** → Export.
4. Keep that file somewhere safe (it downloads as `contacts.vcf` or similar).

This file is your snapshot of *everything as it is right now*. Nothing below can go so wrong that
this file cannot fix it.

## Good to know

**Importing never overwrites or deletes anything.** Google import *adds* new contacts alongside
your existing ones. A bad import means "some duplicate contacts appeared" — not "my contacts are
gone".

## Undo an import (it didn't look right)

1. Open [contacts.google.com](https://contacts.google.com).
2. In the Contacts list, find the contacts you just imported — sort or scroll to them. Select
   them (hover → check the box; or click the top checkbox to select all, then deselect the ones
   that were already there).
3. Click the **three-dot menu** (or the trash icon) → **Delete**.
4. The deleted contacts move to **Trash** — they are recoverable for 30 days.

## Restore something that vanished

1. contacts.google.com → **Trash** (left sidebar).
2. Select the contact(s) → **Recover**.

## Worst case: full reset

If things look muddled and you want to go back to exactly where you started:

1. Delete the contacts you imported (steps above).
2. Import the backup file you exported in "Before you import".
3. You are back to your starting point.

## Why this works

PhoneBook only produces a *file*; Google only changes data when *you* import. Between the backup
export and Google's 30-day Trash, every step is reversible.
