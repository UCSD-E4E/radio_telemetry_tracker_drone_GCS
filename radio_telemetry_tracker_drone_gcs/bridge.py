"""Bridge module for backend-frontend communication."""

from PyQt6.QtCore import QObject, pyqtSignal, pyqtSlot


class Bridge(QObject):
    """Bridge class for calculator operations between Python backend and JavaScript frontend."""

    # Signals that can be emitted to the frontend
    calculation_result = pyqtSignal(float)
    error_message = pyqtSignal(str)

    def __init__(self) -> None:
        """Initialize the bridge."""
        super().__init__()

    @pyqtSlot(float, str, float, result=float)
    def calculate(self, num1: float, operator: str, num2: float) -> float:
        """Perform calculation based on the operator."""
        try:
            result = 0.0
            if operator == '+':
                result = num1 + num2
            elif operator == '-':
                result = num1 - num2
            elif operator == '*':
                result = num1 * num2
            elif operator == '/':
                if num2 == 0:
                    raise ValueError("Division by zero")
                result = num1 / num2
            else:
                raise ValueError(f"Unknown operator: {operator}")
            
            self.calculation_result.emit(result)
            return result
        except Exception as e:
            self.error_message.emit(str(e))
            return 0.0 