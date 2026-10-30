const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

        const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

                loginButton.disabled = true;
                    loginButton.textContent = "Signing in...";
                        loginMessage.textContent = "Checking your details...";
                            loginMessage.style.color = "#786b7c";

                                try {
                                        const { data, error } =
                                                    await supabaseClient.auth.signInWithPassword({
                                                                    email: email,
                                                                                    password: password
                                                                                                });

                                                                                                        if (error) throw error;

                                                                                                                const { data: isAdmin, error: adminError } =
                                                                                                                            await supabaseClient.rpc("is_admin");

                                                                                                                                    if (adminError) throw adminError;

                                                                                                                                            if (!isAdmin) {
                                                                                                                                                        await supabaseClient.auth.signOut();
                                                                                                                                                                    throw new Error("You are not authorised as an administrator.");
                                                                                                                                                                            }

                                                                                                                                                                                    loginMessage.textContent =
                                                                                                                                                                                                "Login successful! Admin access verified.";

                                                                                                                                                                                                        loginMessage.style.color = "green";

                                                                                                                                                                                                            } catch (error) {
                                                                                                                                                                                                                    loginMessage.textContent = error.message;
                                                                                                                                                                                                                            loginMessage.style.color = "red";
                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                    loginButton.disabled = false;
                                                                                                                                                                                                                                        loginButton.textContent = "Sign In";
                                                                                                                                                                                                                                        });
