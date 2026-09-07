from getpass import getpass

from pydantic import BaseModel, ValidationError

from app.dependencies.database import get_database_manager
from app.schemas.user import EmailField, NameField, SensitivePasswordField
from app.services.user import UserService


class SuperuserInput(BaseModel):
    email: EmailField
    password: SensitivePasswordField
    full_name: NameField


def main() -> None:
    email = input("Email: ").strip()
    password = getpass("Password: ")
    full_name = input("Full name (optional): ").strip() or None
    try:
        data = SuperuserInput(email=email, password=password, full_name=full_name)
    except ValidationError as error:
        details = "; ".join(
            f"{issue['loc'][0]}: {issue['msg']}"
            for issue in error.errors(include_input=False, include_url=False)
        )
        # tripguru-ast: ignore[TG-AR001] - CLI boundary renders sanitized validation messages.
        raise SystemExit(f"Invalid administrator input: {details}") from None
    service = UserService(manager=get_database_manager())
    user = service.create_user(
        email=str(data.email),
        full_name=data.full_name,
        password=data.password,
        is_active=True,
        is_superuser=True,
    )
    print(f"Created superuser: {user.id}")


if __name__ == "__main__":
    main()
