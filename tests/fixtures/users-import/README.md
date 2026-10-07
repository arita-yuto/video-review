# User import CSV samples

Files for trying the user import by hand, from the admin Users tab or the maintenance CLI. Emails avoid the seeded users, except where a clash is the point.

| File | Result |
|---|---|
| `valid.csv` | Creates 4 users: Japanese and Korean names, a quoted name with a comma, an empty role (viewer) |
| `valid-excel-utf8.csv` | Creates 2 users. Saved the way Excel's "CSV UTF-8" saves: BOM and CRLF |
| `row-errors.csv` | Creates nobody. One row for each row-level reason, and row 11 clashes with the seeded Bocchi |
| `header-errors.csv` | Creates nobody. Unknown and repeated columns |
| `shift-jis.csv` | Creates nobody. Saved as Shift_JIS, the way Excel's plain "CSV" saves on Japanese Windows |

`valid.csv` and `valid-excel-utf8.csv` succeed once per database: importing either again reports every email as taken.
