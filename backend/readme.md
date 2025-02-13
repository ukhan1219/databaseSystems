Once you're connected to your PostgreSQL database using `psql`, you can use several built-in meta-commands to inspect your database and its tables. Here are some common commands:

1. **List all databases:**

   ```sql
   \l
   ```
   This command lists all databases on the PostgreSQL server.

2. **Connect to a specific database:**

   If you're not already connected to the desired database, you can connect by running:

   ```sql
   \c your_database_name
   ```

3. **List all tables in the current database:**

   ```sql
   \dt
   ```
   This shows a list of tables in the current schema.

4. **List tables in all schemas:**

   ```sql
   \dt *.*
   ```

5. **Describe a specific table:**

   To view the structure of a specific table, use:

   ```sql
   \d table_name
   ```

For example, after connecting to your database, you might run:

```bash
psql "PSQL CONNECT LINK IN .ENV FILE"
```

Then, inside the `psql` shell, type:

```sql
\dt
```

This will display all the tables you've created in your database.
