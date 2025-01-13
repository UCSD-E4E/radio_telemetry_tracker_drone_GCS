"""Popups for the GUI."""

from __future__ import annotations

from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtWidgets import (
    QButtonGroup,
    QGridLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QRadioButton,
)


class UserPopups:
    """Creates popup boxes for user display."""

    def create_text_box(self, name: str, text: str) -> tuple[QGridLayout, QLineEdit]:
        """Create a text box.

        Args:
        ----
            name (str): The name of the text box.
            text (str): The text to display in the text box.

        Returns:
        -------
            tuple[QGridLayout, QLineEdit]: The text box.

        """
        form = QGridLayout()
        form.setColumnStretch(0, 0)

        label = QLabel(name)
        form.addWidget(label)

        line = QLineEdit()
        line.setText(text)

        form.addWidget(line, 0, 1)
        return form, line

    def create_binary_box(
        self,
        name: str,
        labels_list: list[str],
    ) -> tuple[QGridLayout, QRadioButton]:
        """Create a binary box.

        Args:
        ----
            name (str): The name of the binary box.
            labels_list (list[str]): The labels of the binary box.

        Returns:
        -------
            tuple[QGridLayout, QRadioButton]: The binary box.

        """
        form = QGridLayout()
        form.setColumnStretch(1, 0)
        label = QLabel(name)
        form.addWidget(label)
        true_event = QRadioButton(labels_list[0])
        false_event = QRadioButton(labels_list[1])
        true_event.setChecked(True)

        button = QButtonGroup(parent=form)
        button.setExclusive(True)
        button.addButton(true_event)
        button.addButton(false_event)
        form.addWidget(true_event, 0, 1, Qt.AlignLeft)
        form.addWidget(false_event, 0, 0, Qt.AlignRight)
        return form, true_event

    def show_warning(self, text: str, title: str) -> None:
        """Show a warning.

        Args:
        ----
            text (str): The text to display in the warning.
            title (str): The title of the warning.

        """
        msg = QMessageBox()
        msg.setText(title)
        msg.setWindowTitle("Alert")
        msg.setInformativeText(text)
        msg.setIcon(QMessageBox.Critical)
        msg.addButton(QMessageBox.Ok)
        msg.exec_()

    def show_timed_warning(
        self,
        text: str,
        timeout: int,
        title: str = "Warning",
    ) -> None:
        """Show a timed warning.

        Args:
        ----
            text (str): The text to display in the warning.
            timeout (int): The timeout of the warning.
            title (str): The title of the warning.

        """
        msg = QMessageBox()
        QTimer.singleShot(timeout * 1000, lambda: msg.done(0))
        msg.setText(title)
        msg.setWindowTitle("Alert")
        msg.setInformativeText(text)
        msg.setIcon(QMessageBox.Critical)
        msg.addButton(QMessageBox.Ok)
        msg.exec_()
