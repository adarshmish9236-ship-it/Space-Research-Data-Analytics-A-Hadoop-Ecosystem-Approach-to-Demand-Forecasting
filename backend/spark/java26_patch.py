"""
Java 26 + PySpark 3.5 Compatibility Patch + Windows Setup
==========================================================
PySpark 3.5 uses Hadoop 3.3.4 which requires:
1. HADOOP_HOME with winutils.exe for Windows filesystem ops
2. HADOOP_USER_NAME to bypass Subject.getSubject() (removed in Java 21+)
3. Java 17 or earlier for compatibility

Must be called BEFORE creating SparkSession.
"""
import os
import sys


def apply_java26_patch():
    """Apply runtime patches for PySpark on Windows with Java 17."""
    # ── HADOOP_HOME (required for Windows file operations) ──────────────
    if "HADOOP_HOME" not in os.environ:
        os.environ["HADOOP_HOME"] = r"C:\hadoop"
        
    # Ensure hadoop/bin is in PATH so Java can find hadoop.dll
    hadoop_bin = r"C:\hadoop\bin"
    if hadoop_bin not in os.environ.get("PATH", ""):
        os.environ["PATH"] = hadoop_bin + os.pathsep + os.environ.get("PATH", "")

    # ── HADOOP_USER_NAME (bypasses Subject.getSubject()) ─────────────────
    if "HADOOP_USER_NAME" not in os.environ:
        import getpass
        try:
            os.environ["HADOOP_USER_NAME"] = getpass.getuser()
        except Exception:
            os.environ["HADOOP_USER_NAME"] = "sparkuser"

    # ── JAVA_HOME: prefer Java 17 over system Java 26 ────────────────────
    java17_path = r"C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
    if os.path.exists(java17_path):
        os.environ["JAVA_HOME"] = java17_path
        java_bin = os.path.join(java17_path, "bin")
        # Prepend Java 17 bin to PATH so PySpark uses it
        current_path = os.environ.get("PATH", "")
        if java_bin not in current_path:
            os.environ["PATH"] = java_bin + os.pathsep + current_path

    # ── Spark temp dir ────────────────────────────────────────────────────
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", ".spark_temp")
    os.makedirs(temp_dir, exist_ok=True)
    os.environ.setdefault("SPARK_LOCAL_DIRS", os.path.abspath(temp_dir))

    return True
