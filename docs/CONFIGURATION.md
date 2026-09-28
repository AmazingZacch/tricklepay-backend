# Configuration & Environment Variable Precedence

TricklePay backend configuration is loaded using standard environment loaders (`dotenv` / NestJS ConfigModule). Understanding configuration precedence prevents silent misconfigurations where local `.env` values accidentally override production runtime variables.

---

## 1. Environment Variable Precedence Order

When the application boots, configuration values are resolved in the following hierarchical order (**highest precedence first**):

1. **System / Process Environment Variables** (Highest Precedence)
   * Variables explicitly exported in your shell session, injected via Docker/Kubernetes container environments, or passed directly inline at runtime.
2. **Local `.env` File** (Lowest Precedence)
   * Variables defined inside the project root `.env` file used primarily for local development defaults.

> **Rule**: If a variable is defined in both the system process environment and the `.env` file, the **system process environment value wins** and overwrites the file value.

---

## 2. Practical Example of an Overridden Value

Consider your local `.env` file contains the default server port:
```env
PORT=3000