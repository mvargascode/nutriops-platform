import bcrypt from "bcryptjs";
import dotenv from "dotenv"; dotenv.config();
import { pool } from "../src/core/db/connection";

const user = process.argv[2]; //email | username
const pass = process.argv[3]; //nueva contraseña

(async () => {
    try{
        if (!user || !pass) {
            console.error("Uso: ts-node scripts/set-password.ts <email|username> <password>");
            process.exit(1);
        }
        const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
        const hash = await bcrypt.hash(pass, rounds);

        const [r]: any = await pool.query(
            "UPDATE usuarios SET password_hash=? WHERE email=? OR username=?",
            [hash, user, user]
        );
        console.log(r.affectedRows ? "Password actualizado" : "Usuario no encontrado");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();