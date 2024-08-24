from PyQt5.QtWidgets import (
    QLabel,
    QLineEdit,
    QGridLayout,
    QRadioButton,
    QButtonGroup,
    QMessageBox,
)
from PyQt5.QtCore import Qt, QTimer
from typing import List, Any

class UserPopups:
    """
    Creates popup boxes for user display
    """

    def create_text_box(self, name: str, text: str) -> Any:
        form = QGridLayout()
        form.setColumnStretch(0, 0)

        label = QLabel(name)
        form.addWidget(label)

        line = QLineEdit()
        line.setText(text)

        form.addWidget(line, 0, 1)
        return form, line

    def create_binary_box(
        self, name: str, labels_list: List[str], condition: bool
    ) -> Any:
        form = QGridLayout()
        form.setColumnStretch(1, 0)
        label = QLabel(name)
        form.addWidget(label)
        true_event = QRadioButton(labels_list[0])
        false_event = QRadioButton(labels_list[1])
        if condition:
            true_event.setChecked(True)
        else:
            false_event.setChecked(True)

        button = QButtonGroup(parent=form)
        button.setExclusive(True)
        button.addButton(true_event)
        button.addButton(false_event)
        form.addWidget(true_event, 0, 1, Qt.AlignLeft)
        form.addWidget(false_event, 0, 0, Qt.AlignRight)
        return form, true_event

    def show_warning(self, text: str, title: str):
        msg = QMessageBox()
        msg.setText(title)
        msg.setWindowTitle("Alert")
        msg.setInformativeText(text)
        msg.setIcon(QMessageBox.Critical)
        msg.addButton(QMessageBox.Ok)
        msg.exec_()

    def show_timed_warning(self, text: str, timeout: int, title: str = "Warning"):
        msg = QMessageBox()
        QTimer.singleShot(timeout * 1000, lambda: msg.done(0))
        msg.setText(title)
        msg.setWindowTitle("Alert")
        msg.setInformativeText(text)
        msg.setIcon(QMessageBox.Critical)
        msg.addButton(QMessageBox.Ok)
        msg.exec_()