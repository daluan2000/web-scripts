from __future__ import annotations

from app.services.downloader import _should_suppress_cancel_error


def test_should_suppress_cancel_error_when_cancel_requested() -> None:
    assert _should_suppress_cancel_error(
        "ERROR: unable to open for writing: [Errno 2] No such file or directory",
        lambda: True,
    )


def test_should_not_suppress_non_cancel_context() -> None:
    assert not _should_suppress_cancel_error(
        "ERROR: unable to open for writing: [Errno 2] No such file or directory",
        lambda: False,
    )


def test_should_suppress_rename_error_when_cancel_requested() -> None:
    assert _should_suppress_cancel_error(
        "ERROR: Unable to rename file: [Errno 2] No such file or directory",
        lambda: True,
    )


def test_should_suppress_fragment_error_when_cancel_requested() -> None:
    assert _should_suppress_cancel_error(
        "ERROR: fragment 12 not found",
        lambda: True,
    )


def test_should_not_suppress_generic_no_such_file_error() -> None:
    assert not _should_suppress_cancel_error(
        "ERROR: No such file or directory",
        lambda: True,
    )


def test_should_not_suppress_unrelated_error_message() -> None:
    assert not _should_suppress_cancel_error(
        "ERROR: HTTP Error 403: Forbidden",
        lambda: True,
    )
