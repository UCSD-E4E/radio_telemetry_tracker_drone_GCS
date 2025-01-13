"""Dialogs for the RTT Drone GCS."""

from __future__ import annotations

from PyQt5.QtCore import QRegExp
from PyQt5.QtGui import QRegExpValidator
from PyQt5.QtWidgets import (
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
    QWidget,
    QWizard,
    QWizardPage,
)

from rttDroneGCS.config import get_config_path, get_instance

from .popups import UserPopups


class BaseDialog(QWizard):
    """Base dialog class."""

    def __init__(self, parent: QWidget, title: str, page_class: QWizardPage) -> None:
        """Initialize the dialog.

        Args:
        ----
            parent (QWidget): The parent widget.
            title (str): The title of the dialog.
            page_class (QWizardPage): The page class.

        """
        super().__init__(parent)
        self.parent = parent
        self.setWindowTitle(title)
        self.page = page_class(self)
        self.addPage(self.page)
        self.resize(640, 480)
        self.button(QWizard.FinishButton).clicked.connect(self.submit)

    def submit(self) -> None:
        """Submit the dialog."""
        msg = "Subclasses must implement submit method"
        raise NotImplementedError(msg)


class BaseDialogPage(QWizardPage):
    """Base dialog page class."""

    def __init__(self, parent: QWizard) -> None:
        """Initialize the dialog page.

        Args:
        ----
            parent (QWizard): The parent wizard.

        """
        super().__init__(parent)
        self._parent = parent
        self.user_pops = UserPopups()
        self._create_widget()

    def _create_widget(self) -> None:
        msg = "Subclasses must implement _create_widget method"
        raise NotImplementedError(msg)


class ExpertSettingsDialog(BaseDialog):
    """Expert settings dialog."""

    def __init__(self, parent: QWidget, option_vars: dict) -> None:
        """Initialize the expert settings dialog.

        Args:
        ----
            parent (QWidget): The parent widget.
            option_vars (dict): The option variables.

        """
        super().__init__(
            parent,
            "Expert/Engineering Settings",
            ExpertSettingsDialogPage,
        )
        self.option_vars = option_vars
        self.page.option_vars = option_vars
        self.parent.updateGUIOptionVars(0xFF, self.option_vars)

    def submit(self) -> None:
        """Submit the expert settings dialog."""
        if not self.page.validate_parameters():
            self.page.user_pops.show_warning(
                "Entered information could not be validated",
                "Invalid Input",
            )
            return
        self.parent.submitGUIOptionVars(0xFF)


class ExpertSettingsDialogPage(BaseDialogPage):
    """Expert settings dialog page."""

    def _create_widget(self) -> None:
        exp_settings_frame = QGridLayout()

        labels = [
            "Expected Ping Width (ms)",
            "Min. Width Multiplier",
            "Max. Width Multiplier",
            "Min. Ping SNR(dB)",
            "GPS Port",
            "GPS Baud Rate",
            "Output Directory",
            "GPS Mode",
            "SYS Autostart",
        ]
        input_fields = [
            "DSP_pingWidth",
            "DSP_pingMin",
            "DSP_pingMax",
            "DSP_pingSNR",
            "GPS_device",
            "GPS_baud",
            "SYS_outputDir",
            "GPS_mode",
            "SYS_autostart",
        ]

        for i, (label_text, field_name) in enumerate(zip(labels, input_fields)):
            exp_settings_frame.addWidget(QLabel(label_text), i, 0)
            self.option_vars[field_name] = QLineEdit()
            exp_settings_frame.addWidget(self.option_vars[field_name], i, 1)

        btn_submit = QPushButton("Submit")
        btn_submit.clicked.connect(self._parent.submit)
        exp_settings_frame.addWidget(btn_submit, len(labels), 0, 1, 2)

        self.setLayout(exp_settings_frame)

    def validate_parameters(self) -> bool:
        """Validate the parameters."""
        return True


class AddTargetDialog(BaseDialog):
    """Add target dialog."""

    def __init__(
        self,
        parent: QWidget,
        center_frequency: int,
        sampling_frequency: int,
    ) -> None:
        """Initialize the add target dialog.

        Args:
        ----
            parent (QWidget): The parent widget.
            center_frequency (int): The center frequency.
            sampling_frequency (int): The sampling frequency.

        """
        super().__init__(parent, "Add Target", AddTargetDialogPage)
        self.center_frequency = center_frequency
        self.sampling_frequency = sampling_frequency
        self.page.center_frequency = center_frequency
        self.page.sampling_frequency = sampling_frequency

    def submit(self) -> None:
        """Submit the add target dialog."""
        if not self._validate():
            self.user_pops.show_warning(
                "You have entered an invalid target frequency. Please try again.",
                "Invalid frequency",
            )
            return
        self.name = self.page.target_name_entry.text()
        self.freq = int(self.page.target_freq_entry.text())

    def _validate(self) -> bool:
        return (
            abs(int(self.page.target_freq_entry.text()) - self.center_frequency)
            <= self.sampling_frequency
        )


class AddTargetDialogPage(BaseDialogPage):
    """Add target dialog page."""

    def _create_widget(self) -> None:
        frm_target_settings = QGridLayout()

        lbl_target_name = QLabel("Target Name:")
        frm_target_settings.addWidget(lbl_target_name, 0, 0)
        self.target_name_entry = QLineEdit()
        frm_target_settings.addWidget(self.target_name_entry, 0, 1)

        lbl_target_freq = QLabel("Target Frequency:")
        frm_target_settings.addWidget(lbl_target_freq, 1, 0)
        self.target_freq_entry = QLineEdit()
        frm_target_settings.addWidget(self.target_freq_entry, 1, 1)

        regex_string = QRegExp(r"^\d{1,9}$")
        val = QRegExpValidator(regex_string)
        self.target_freq_entry.setValidator(val)

        lbl_center_freq = QLabel(f"Center Frequency: {self.center_frequency} Hz")
        frm_target_settings.addWidget(lbl_center_freq, 2, 0, 1, 2)

        lbl_sampling_freq = QLabel(f"Sampling Frequency: {self.sampling_frequency} Hz")
        frm_target_settings.addWidget(lbl_sampling_freq, 3, 0, 1, 2)

        lbl_valid_range = QLabel(
            f"Valid Range: {self.center_frequency - self.sampling_frequency} to "
            f"{self.center_frequency + self.sampling_frequency} Hz",
        )
        frm_target_settings.addWidget(lbl_valid_range, 4, 0, 1, 2)

        self.setLayout(frm_target_settings)


class ConnectionDialog(BaseDialog):
    """Connection dialog."""

    def __init__(self, parent: QWidget) -> None:
        """Initialize the connection dialog.

        Args:
        ----
            parent (QWidget): The parent widget.

        """
        super().__init__(parent, "LoRa Connection Settings", ConnectionDialogPage)

    def _submit(self) -> None:
        is_valid, error_message = self.page.validate_input()
        if not is_valid:
            UserPopups().show_warning(error_message, "Invalid Input")
            return
        self.parent.config.lora_port = self.page.port_entry.text()
        self.parent.config.lora_baud = int(self.page.baud_entry.text())
        self.parent.config.lora_frequency = int(self.page.freq_entry.text())
        self.parent.config.write()


class ConnectionDialogPage(BaseDialogPage):
    """Connection dialog page."""

    def _create_widget(self) -> None:
        frm_holder = QVBoxLayout()

        for label, attr in [
            ("LoRa Port", "lora_port"),
            ("LoRa Baud Rate", "lora_baud"),
            ("LoRa Frequency", "lora_frequency"),
        ]:
            frm = QHBoxLayout()
            frm.addWidget(QLabel(label))
            entry = QLineEdit()
            entry.setText(str(getattr(self._parent.parent.config, attr)))
            frm.addWidget(entry)
            frm_holder.addLayout(frm)
            setattr(self, f"{attr.split('_')[1]}_entry", entry)

        self.setLayout(frm_holder)

    def validate_input(self) -> tuple[bool, str]:
        """Validate the input."""
        try:
            int(self.baud_entry.text())
            int(self.freq_entry.text())
        except ValueError:
            return False, "Invalid baud rate or frequency"
        else:
            return True, ""


class ConfigDialog(BaseDialog):
    """Config dialog."""

    def __init__(self, parent: QWidget) -> None:
        """Initialize the config dialog.

        Args:
        ----
            parent (QWidget): The parent widget.

        """
        super().__init__(parent, "Edit Configuration Settings", ConfigDialogPage)
        self.config = get_instance(get_config_path())

    def _submit(self) -> None:
        try:
            self.config.map_extent = (
                (float(self.page.lat_1[1].text()), float(self.page.lon_1[1].text())),
                (float(self.page.lat_2[1].text()), float(self.page.lon_2[1].text())),
            )
            self.config.lora_port = self.page.lora_port[1].text()
            self.config.lora_baud = int(self.page.lora_baud[1].text())
            self.config.lora_frequency = int(self.page.lora_frequency[1].text())
            self.config.write()
            UserPopups().show_warning("Configuration updated successfully", "Success")
            if self.parent:
                self.parent.close()
        except ValueError as e:
            UserPopups().show_warning(f"Invalid input: {e}", "Error")
        except (OSError, AttributeError) as e:
            UserPopups().show_warning(f"Configuration error: {e}", "Error")


class ConfigDialogPage(BaseDialogPage):
    """Config dialog page."""

    def _create_widget(self) -> None:
        frm_holder = QVBoxLayout()

        for label, attr in [
            ("Lat 1", "map_extent[0][0]"),
            ("Lon 1", "map_extent[0][1]"),
            ("Lat 2", "map_extent[1][0]"),
            ("Lon 2", "map_extent[1][1]"),
            ("LoRa Port", "lora_port"),
            ("LoRa Baud Rate", "lora_baud"),
            ("LoRa Frequency", "lora_frequency"),
        ]:
            value = self._get_nested_attr(self._parent.config, attr)
            text_box = self.user_pops.create_text_box(label, str(value))
            frm_holder.addLayout(text_box[0])
            setattr(
                self,
                attr.split(".")[-1].replace("[", "_").replace("]", ""),
                text_box,
            )

        self.setLayout(frm_holder)

    def _get_nested_attr(self, obj: object, attr: str) -> object:
        parts = attr.replace("]", "").replace("[", ".").split(".")
        for part in parts:
            obj = obj[int(part)] if part.isdigit() else getattr(obj, part)
        return obj
