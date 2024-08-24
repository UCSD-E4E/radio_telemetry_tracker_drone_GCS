from PyQt5.QtCore import QRegExp
from PyQt5.QtGui import QRegExpValidator
from PyQt5.QtWidgets import (
    QLabel,
    QLineEdit,
    QPushButton,
    QWizard,
    QWizardPage,
    QGridLayout,
    QHBoxLayout,
    QCheckBox,
)

from pathlib import Path
from typing import Any

from rttDroneGCS.config import ConnectionMode, get_config_path
from .popups import UserPopups


class ExpertSettingsDialog(QWizard):
    def __init__(self, parent, option_vars):
        super(ExpertSettingsDialog, self).__init__(parent)
        self.parent = parent
        self.addPage(ExpertSettingsDialogPage(self, option_vars))
        self.setWindowTitle("Expert/Engineering Settings")
        self.resize(640, 480)


class ExpertSettingsDialogPage(QWizardPage):
    def __init__(self, parent=None, option_vars=None):
        super(ExpertSettingsDialogPage, self).__init__(parent)
        self.__parent = parent
        self.option_vars = option_vars
        self.user_popups = UserPopups()
        self.__create_widget()
        self.__parent.parent.upgradeGUIOptionVars(0xFF, self.option_vars)

    def __create_widget(self):
        """
        Internal function to create widgets
        """
        exp_settings_frame = QGridLayout()

        lbl_ping_width = QLabel("Expected Ping Width(ms)")
        exp_settings_frame.addWidget(lbl_ping_width, 0, 0)

        lbl_min_width_mult = QLabel("Min. Width Multiplier")
        exp_settings_frame.addWidget(lbl_min_width_mult, 1, 0)

        lbl_max_width_mult = QLabel("Max. Width Multiplier")
        exp_settings_frame.addWidget(lbl_max_width_mult, 2, 0)

        lbl_min_ping_snr = QLabel("Min. Ping SNR(dB)")
        exp_settings_frame.addWidget(lbl_min_ping_snr, 3, 0)

        lbl_gps_port = QLabel("GPS Port")
        exp_settings_frame.addWidget(lbl_gps_port, 4, 0)

        lbl_gps_baud_rate = QLabel("GPS Baud Rate")
        exp_settings_frame.addWidget(lbl_gps_baud_rate, 5, 0)

        lbl_output_dir = QLabel("Output Directory")
        exp_settings_frame.addWidget(lbl_output_dir, 6, 0)

        lbl_gps_mode = QLabel("GPS Mode")
        exp_settings_frame.addWidget(lbl_gps_mode, 7, 0)

        lbl_sys_auto_start = QLabel("SYS Autostart")
        exp_settings_frame.addWidget(lbl_sys_auto_start, 8, 0)

        self.option_vars["DSP_pingWidth"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["DSP_pingWidth"], 0, 1)

        self.option_vars["DSP_pingMin"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["DSP_pingMin"], 1, 1)

        self.option_vars["DSP_pingMax"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["DSP_pingMax"], 2, 1)

        self.option_vars["DSP_pingSNR"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["DSP_pingSNR"], 3, 1)

        self.option_vars["GPS_device"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["GPS_device"], 4, 1)

        self.option_vars["GPS_baud"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["GPS_baud"], 5, 1)

        self.option_vars["SYS_outputDir"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["SYS_outputDir"], 6, 1)

        self.option_vars["GPS_mode"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["GPS_mode"], 7, 1)

        self.option_vars["SYS_autostart"] = QLineEdit()
        exp_settings_frame.addWidget(self.option_vars["SYS_autostart"], 8, 1)

        btn_submit = QPushButton("submit")
        btn_submit.clicked.connect(self.submit)
        exp_settings_frame.addWidget(btn_submit, 9, 0, 1, 2)

        self.setLayout(exp_settings_frame)

    def __validate_parameters(self):
        """
        Internal function to validate parameters
        """
        return True

    def submit(self):
        """
        Internal function to submit entered parameters
        """
        if not self.__validate_parameters():
            self.user_popups.show_warning(text="Entered information could not be validated")
            return
        self.__parent.parent.submitGUIOptionVars(0xFF)



