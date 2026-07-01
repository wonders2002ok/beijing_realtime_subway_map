"""
Tests for build.py — schedule data processing functions.
Run: python -m pytest scripts/tests/
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import build


class TestExpandDelta:
    """Delta expansion: compressed schedule → flat HH:MM list."""

    def test_simple_delta(self):
        result = build.expand_delta('05:30', [2, 3, 5])
        assert result == ['05:30', '05:32', '05:35', '05:40']

    def test_repeated_delta(self):
        # 3 repetitions of +2: 06:00, +2, +2, +2
        result = build.expand_delta('06:00', [[3, [2]]])
        assert result == ['06:00', '06:02', '06:04', '06:06']

    def test_nested_delta(self):
        # 2 repetitions of [+1, +2]
        result = build.expand_delta('10:00', [[2, [1, 2]]])
        assert result == ['10:00', '10:01', '10:03', '10:04', '10:06']

    def test_no_delta(self):
        result = build.expand_delta('08:00', [])
        assert result == ['08:00']

    def test_hour_rollover(self):
        result = build.expand_delta('05:55', [5, 5])
        assert result == ['05:55', '06:00', '06:05']


class TestTimeToMin:
    """HH:MM string → minutes since midnight."""

    def test_midnight(self):
        assert build.time_to_min('00:00') == 0

    def test_noon(self):
        assert build.time_to_min('12:00') == 720

    def test_end_of_day(self):
        assert build.time_to_min('23:59') == 1439

    def test_early_morning(self):
        assert build.time_to_min('05:30') == 330


class TestLineCode:
    """Line code generation from filename."""

    def test_numeric_line(self):
        assert build.get_line_code('line1.json5') == '01'
        assert build.get_line_code('line10.json5') == '10'
        assert build.get_line_code('line19.json5') == '19'

    def test_special_line(self):
        assert build.get_line_code('fangshan-line.json5') == 'FS'
        assert build.get_line_code('capital-airport-express.json5') == 'PEK'
        assert build.get_line_code('daxing-airport-express.json5') == 'PKX'
        assert build.get_line_code('yizhuang-t1-line.json5') == 'YT'
        assert build.get_line_code('line-s1.json5') == 'S1'

    def test_unknown_line(self):
        assert build.get_line_code('unknown-line.json5') == '??'


class TestGetAllTimes:
    """Schedule blocks → flat time list."""

    def test_direct_trains(self):
        blocks = [{'trains': ['05:00', '05:10', '05:20']}]
        result = build.get_all_times(blocks)
        assert result == ['05:00', '05:10', '05:20']

    def test_delta_block(self):
        blocks = [{'first_train': '06:00', 'delta': [5, 5]}]
        result = build.get_all_times(blocks)
        assert result == ['06:00', '06:05', '06:10']

    def test_mixed_blocks(self):
        blocks = [
            {'trains': ['05:00']},
            {'first_train': '05:30', 'delta': [10, 10]},
        ]
        result = build.get_all_times(blocks)
        assert result == ['05:00', '05:30', '05:40', '05:50']
