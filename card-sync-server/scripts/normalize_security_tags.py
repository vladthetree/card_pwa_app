#!/usr/bin/env python3
"""Normalize card tags to a Security+/defensive-security taxonomy."""

from __future__ import annotations

import argparse
import collections
import html
import json
import re
import sqlite3
import time
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = SERVER_ROOT.parent
DB_PATH = SERVER_ROOT / "sync.db"

SOURCE = "tag-normalization"
SOURCE_CLIENT = "tag-normalization-script"

FINAL_TAGS = [
    "asset_management",
    "authentication",
    "authorization",
    "automation_orchestration",
    "business_continuity_disaster_recovery",
    "change_management",
    "cloud_security",
    "cryptography",
    "data_security",
    "detection_response",
    "digital_forensics",
    "email_security",
    "endpoint_security",
    "governance_risk_compliance",
    "hardening",
    "identity_access_management",
    "incident_response",
    "logging_monitoring",
    "malware_analysis",
    "mobile_security",
    "network_security",
    "operational_technology",
    "physical_security",
    "security_architecture",
    "security_awareness",
    "security_operations",
    "threat_intelligence",
    "threats_attacks",
    "vulnerability_management",
    "wireless_security",
    "application_security",
]

FINAL_TAG_SET = set(FINAL_TAGS)
TAG_PRIORITY = {tag: idx for idx, tag in enumerate(FINAL_TAGS)}

INVALID_OR_OPERATIONAL_TAGS = {
    "01_05",
    "duplicate",
    "general",
    "general security",
    "misc",
    "needs_review",
    "origin",
    "origin_01_05_pre_subdecks",
    "other",
    "review",
    "secops_threat_intelligence",
    "source_messer",
    "source_soc_analyst",
    "temp",
    "unknown",
    "validated",
}

OLD_TAG_HINTS = {
    "general_security_concepts": ["security_architecture"],
    "security_operations": ["security_operations"],
    "security_program_management_oversight": ["governance_risk_compliance"],
    "threats_vulnerabilities_mitigations": ["threats_attacks", "vulnerability_management"],
    "secops_access_control": ["authorization", "identity_access_management"],
    "secops_authentication": ["authentication", "identity_access_management"],
    "secops_cloud_security": ["cloud_security"],
    "secops_data_protection": ["data_security"],
    "secops_endpoint_security": ["endpoint_security", "detection_response"],
    "secops_forensics": ["digital_forensics", "incident_response"],
    "secops_hardening": ["hardening"],
    "secops_identity_management": ["identity_access_management"],
    "secops_incident_response": ["incident_response"],
    "secops_log_analysis": ["logging_monitoring"],
    "secops_logging": ["logging_monitoring"],
    "secops_malware_analysis": ["malware_analysis"],
    "secops_mobile_security": ["mobile_security"],
    "secops_monitoring": ["logging_monitoring", "detection_response"],
    "secops_network_monitoring": ["logging_monitoring", "network_security"],
    "secops_network_security": ["network_security"],
    "secops_secure_coding": ["application_security"],
    "secops_threat_intelligence": ["threat_intelligence"],
    "secops_vulnerability_management": ["vulnerability_management"],
}

DECK_HINTS = {
    "01_general_security_concepts": ["security_architecture"],
    "02_threats_vulnerabilities_mitigations": ["threats_attacks", "vulnerability_management"],
    "03_security_architecture": ["security_architecture"],
    "04_security_operations": ["security_operations"],
    "05_security_program_management_oversight": ["governance_risk_compliance"],
    "1.1 security controls": ["security_architecture"],
    "1.2 security concepts": ["security_architecture"],
    "1.3 change management": ["change_management", "governance_risk_compliance"],
    "1.4 cryptographic solutions": ["cryptography"],
    "2.1 threat actors": ["threat_intelligence", "threats_attacks"],
    "2.2 threat vectors and attack surfaces": ["threats_attacks"],
    "2.3 types of vulnerabilities": ["vulnerability_management"],
    "2.4 indicators of malicious activity": ["detection_response", "threat_intelligence"],
    "2.5 mitigation techniques": ["hardening", "security_architecture"],
    "3.1 architecture models": ["security_architecture"],
    "3.2 applying security principles": ["hardening", "security_architecture"],
    "3.3 protecting data": ["data_security", "cryptography"],
    "3.4 resiliency and recovery": ["business_continuity_disaster_recovery"],
    "4.1 security techniques": ["security_operations", "hardening"],
    "4.2 asset management": ["asset_management"],
    "4.3 vulnerability management": ["vulnerability_management"],
    "4.4 security monitoring": ["logging_monitoring", "detection_response"],
    "4.5 enterprise security": ["security_architecture", "network_security"],
    "4.6 identity and access management": ["identity_access_management"],
    "4.7 automation and orchestration": ["automation_orchestration"],
    "4.8 incident response": ["incident_response"],
    "4.9 security data sources": ["logging_monitoring"],
    "5.1 security governance": ["governance_risk_compliance"],
    "5.2 risk management": ["governance_risk_compliance"],
    "5.3 third-party risk": ["governance_risk_compliance"],
    "5.4 security compliance": ["governance_risk_compliance"],
    "5.5 audits and assessments": ["governance_risk_compliance", "logging_monitoring"],
    "5.6 security awareness": ["security_awareness"],
    "review 1.1 security controls": ["security_architecture"],
    "review 1.2 security concepts": ["security_architecture"],
    "review 1.3 change management": ["change_management", "governance_risk_compliance"],
    "review 1.4 cryptographic solutions": ["cryptography"],
    "review 2.1 threat actors": ["threat_intelligence", "threats_attacks"],
    "review 2.2 threat vectors and attack surfaces": ["threats_attacks"],
    "review 2.3 types of vulnerabilities": ["vulnerability_management"],
    "review 2.4 indicators of malicious activity": ["detection_response", "threat_intelligence"],
    "review 2.5 mitigation techniques": ["hardening", "security_architecture"],
    "review 3.1 architecture models": ["security_architecture"],
    "review 3.2 applying security principles": ["hardening", "security_architecture"],
    "review 3.3 protecting data": ["data_security", "cryptography"],
    "review 3.4 resiliency and recovery": ["business_continuity_disaster_recovery"],
    "review 4.1 security techniques": ["security_operations", "hardening"],
    "review 4.2 asset management": ["asset_management"],
    "review 4.3 vulnerability management": ["vulnerability_management"],
    "review 4.4 security monitoring": ["logging_monitoring", "detection_response"],
    "review 4.5 enterprise security": ["security_architecture", "network_security"],
    "review 4.6 identity and access management": ["identity_access_management"],
    "review 4.7 automation and orchestration": ["automation_orchestration"],
    "review 4.8 incident response": ["incident_response"],
    "review 4.9 security data sources": ["logging_monitoring"],
    "review 5.1 security governance": ["governance_risk_compliance"],
    "review 5.2 risk management": ["governance_risk_compliance"],
    "review 5.3 third-party risk": ["governance_risk_compliance"],
    "review 5.4 security compliance": ["governance_risk_compliance"],
    "review 5.5 audits and assessments": ["governance_risk_compliance", "logging_monitoring"],
    "review 5.6 security awareness": ["security_awareness"],
    "pbq test": ["security_operations"],
}

ACRONYM_TAGS = {
    "aaa": ["authentication", "authorization", "logging_monitoring"],
    "abac": ["authorization", "identity_access_management"],
    "acl": ["authorization", "network_security"],
    "aes": ["cryptography"],
    "aes-256": ["cryptography"],
    "ah": ["cryptography", "network_security"],
    "ai": ["security_operations"],
    "ale": ["governance_risk_compliance"],
    "ap": ["wireless_security", "network_security"],
    "api": ["application_security"],
    "apt": ["threat_intelligence", "threats_attacks"],
    "arp": ["network_security"],
    "aslr": ["hardening", "endpoint_security"],
    "att&ck": ["threat_intelligence"],
    "aup": ["governance_risk_compliance"],
    "av": ["endpoint_security", "malware_analysis"],
    "bash": ["endpoint_security"],
    "bcdr": ["business_continuity_disaster_recovery"],
    "bcp": ["business_continuity_disaster_recovery"],
    "bgp": ["network_security"],
    "bia": ["business_continuity_disaster_recovery", "governance_risk_compliance"],
    "bios": ["endpoint_security", "hardening"],
    "bpa": ["governance_risk_compliance"],
    "bpdu": ["network_security"],
    "byod": ["mobile_security", "governance_risk_compliance"],
    "coop": ["business_continuity_disaster_recovery"],
    "ca": ["cryptography"],
    "captcha": ["authentication", "application_security"],
    "casb": ["cloud_security"],
    "ccmp": ["wireless_security", "cryptography"],
    "cctv": ["physical_security"],
    "cfb": ["cryptography"],
    "cia": ["security_architecture"],
    "cirt": ["incident_response"],
    "cio": ["governance_risk_compliance"],
    "cope": ["mobile_security"],
    "crl": ["cryptography"],
    "csrf": ["application_security"],
    "css": ["application_security"],
    "cso": ["governance_risk_compliance"],
    "csu": ["network_security"],
    "cto": ["governance_risk_compliance"],
    "cve": ["vulnerability_management"],
    "cvss": ["vulnerability_management"],
    "cyod": ["mobile_security"],
    "dba": ["data_security"],
    "ddos": ["threats_attacks", "network_security"],
    "dhcp": ["network_security"],
    "dll": ["endpoint_security", "application_security"],
    "dlp": ["data_security"],
    "dmarc": ["email_security"],
    "dnat": ["network_security"],
    "dns": ["network_security"],
    "dos": ["threats_attacks", "network_security"],
    "drp": ["business_continuity_disaster_recovery"],
    "dsa": ["cryptography"],
    "dsl": ["network_security"],
    "ecc": ["cryptography"],
    "ecb": ["cryptography"],
    "ecdhe": ["cryptography"],
    "ecdsa": ["cryptography"],
    "edr": ["endpoint_security", "detection_response"],
    "efs": ["data_security", "cryptography"],
    "erp": ["governance_risk_compliance"],
    "esn": ["mobile_security"],
    "facl": ["authorization"],
    "far": ["authentication"],
    "federation": ["identity_access_management"],
    "fim": ["endpoint_security", "detection_response"],
    "fpga": ["endpoint_security"],
    "frr": ["authentication"],
    "ftp": ["network_security"],
    "ftps": ["network_security", "cryptography"],
    "gcmp": ["wireless_security", "cryptography"],
    "gbic/sfp": ["network_security"],
    "gdpr": ["governance_risk_compliance", "data_security"],
    "gpg": ["cryptography", "email_security"],
    "gpo": ["hardening"],
    "gpu": ["endpoint_security"],
    "ha": ["business_continuity_disaster_recovery"],
    "hdd": ["data_security"],
    "hids": ["endpoint_security", "detection_response"],
    "hips": ["endpoint_security", "detection_response"],
    "hmac": ["cryptography"],
    "hotp": ["authentication", "cryptography"],
    "hsm": ["cryptography"],
    "html": ["application_security"],
    "http": ["network_security", "application_security"],
    "https": ["network_security", "cryptography"],
    "hvac": ["physical_security"],
    "iaas": ["cloud_security"],
    "iac": ["cloud_security", "automation_orchestration"],
    "iam": ["identity_access_management"],
    "icmp": ["network_security"],
    "ics": ["operational_technology"],
    "ids": ["detection_response", "network_security"],
    "idp": ["identity_access_management", "authentication"],
    "idea": ["cryptography"],
    "ieee": ["network_security"],
    "imap": ["email_security"],
    "im": ["network_security"],
    "ioc": ["threat_intelligence", "detection_response"],
    "iot": ["operational_technology", "endpoint_security"],
    "ip": ["network_security"],
    "ips": ["detection_response", "network_security"],
    "ipsec": ["network_security", "cryptography"],
    "ir": ["incident_response"],
    "irp": ["incident_response"],
    "irc": ["network_security", "malware_analysis"],
    "iso": ["governance_risk_compliance"],
    "isp": ["network_security"],
    "isso": ["governance_risk_compliance"],
    "iv": ["cryptography"],
    "kdc": ["authentication", "cryptography"],
    "lan": ["network_security"],
    "l2tp": ["network_security"],
    "ldap": ["identity_access_management", "authentication"],
    "ldaps": ["identity_access_management", "authentication", "cryptography"],
    "mac": ["cryptography"],
    "maas": ["logging_monitoring", "cloud_security"],
    "md5": ["cryptography"],
    "mdm": ["mobile_security"],
    "mfa": ["authentication"],
    "mic": ["wireless_security", "cryptography"],
    "mfd": ["endpoint_security"],
    "ml": ["security_operations"],
    "mms": ["mobile_security"],
    "moa": ["governance_risk_compliance"],
    "mou": ["governance_risk_compliance"],
    "mschap": ["authentication"],
    "msa": ["governance_risk_compliance"],
    "msp": ["governance_risk_compliance"],
    "mssp": ["security_operations", "governance_risk_compliance"],
    "mtbf": ["business_continuity_disaster_recovery"],
    "mttf": ["business_continuity_disaster_recovery"],
    "mttr": ["business_continuity_disaster_recovery"],
    "mtu": ["network_security"],
    "nac": ["network_security", "identity_access_management"],
    "nat": ["network_security"],
    "nda": ["governance_risk_compliance", "data_security"],
    "nfc": ["wireless_security", "mobile_security"],
    "ngfw": ["network_security"],
    "nids": ["detection_response", "network_security"],
    "nips": ["detection_response", "network_security"],
    "nist": ["governance_risk_compliance"],
    "ntfs": ["authorization", "data_security"],
    "nvme": ["data_security"],
    "oauth": ["authorization", "identity_access_management"],
    "ocsp": ["cryptography"],
    "os": ["endpoint_security"],
    "osint": ["threat_intelligence"],
    "ospf": ["network_security"],
    "opsec": ["governance_risk_compliance", "data_security"],
    "ota": ["mobile_security"],
    "p12": ["cryptography"],
    "p2p": ["network_security"],
    "paas": ["cloud_security"],
    "pam": ["authentication", "identity_access_management"],
    "pat": ["network_security"],
    "pbkdf2": ["cryptography", "authentication"],
    "pbx": ["network_security"],
    "pcap": ["logging_monitoring", "network_security"],
    "pci": ["governance_risk_compliance", "data_security"],
    "pdp": ["authorization", "security_architecture"],
    "pep": ["authorization", "security_architecture"],
    "pgp": ["cryptography", "email_security"],
    "phi": ["data_security", "governance_risk_compliance"],
    "pii": ["data_security", "governance_risk_compliance"],
    "pki": ["cryptography"],
    "pnp": ["endpoint_security"],
    "pop": ["email_security"],
    "ppp": ["network_security"],
    "pptp": ["network_security", "cryptography"],
    "psk": ["authentication", "cryptography", "wireless_security"],
    "qa": ["application_security"],
    "qos": ["network_security"],
    "radius": ["authentication", "identity_access_management", "network_security"],
    "race": ["cryptography"],
    "rad": ["application_security"],
    "raid": ["business_continuity_disaster_recovery", "data_security"],
    "rat": ["malware_analysis", "threats_attacks"],
    "rc4": ["cryptography", "wireless_security"],
    "rdp": ["network_security"],
    "rfid": ["physical_security", "wireless_security"],
    "ripemd": ["cryptography"],
    "roi": ["governance_risk_compliance"],
    "rpo": ["business_continuity_disaster_recovery"],
    "rstp": ["network_security"],
    "rto": ["business_continuity_disaster_recovery"],
    "rtos": ["operational_technology", "endpoint_security"],
    "rtp": ["network_security"],
    "s/mime": ["email_security", "cryptography"],
    "saas": ["cloud_security"],
    "saml": ["identity_access_management", "authentication"],
    "sast": ["application_security"],
    "scada": ["operational_technology"],
    "scap": ["vulnerability_management", "automation_orchestration"],
    "scep": ["cryptography", "automation_orchestration"],
    "sd-wan": ["network_security"],
    "sdk": ["application_security"],
    "sdlc": ["application_security"],
    "sdlm": ["application_security"],
    "sdn": ["network_security", "security_architecture"],
    "sed": ["data_security", "cryptography"],
    "se": ["endpoint_security", "hardening"],
    "selinux": ["authorization", "hardening"],
    "sftp": ["network_security", "cryptography"],
    "sha": ["cryptography"],
    "shttp": ["network_security", "cryptography"],
    "siem": ["logging_monitoring", "detection_response"],
    "sla": ["governance_risk_compliance", "business_continuity_disaster_recovery"],
    "sms": ["mobile_security", "authentication"],
    "smtp": ["email_security"],
    "smtps": ["email_security", "cryptography"],
    "snmp": ["logging_monitoring", "network_security"],
    "soar": ["automation_orchestration", "incident_response"],
    "soc": ["security_operations"],
    "soap": ["application_security"],
    "sop": ["governance_risk_compliance"],
    "sow": ["governance_risk_compliance"],
    "spf": ["email_security"],
    "sql": ["application_security", "data_security"],
    "sqli": ["application_security"],
    "ssd": ["data_security"],
    "ssh": ["network_security", "cryptography"],
    "ssl": ["cryptography", "network_security"],
    "sso": ["identity_access_management", "authentication"],
    "stp": ["network_security"],
    "stix": ["threat_intelligence"],
    "tacacs+": ["authentication", "identity_access_management", "network_security"],
    "taxii": ["threat_intelligence"],
    "tcp/ip": ["network_security"],
    "tgt": ["authentication"],
    "tls": ["cryptography", "network_security"],
    "totp": ["authentication", "cryptography"],
    "tpm": ["cryptography", "endpoint_security"],
    "ttp": ["threat_intelligence"],
    "uav": ["physical_security"],
    "udp": ["network_security"],
    "uefi": ["endpoint_security", "hardening"],
    "uem": ["mobile_security", "endpoint_security"],
    "uid": ["application_security"],
    "ups": ["business_continuity_disaster_recovery", "physical_security"],
    "uri": ["application_security"],
    "url": ["application_security"],
    "usb otg": ["mobile_security", "endpoint_security"],
    "utm": ["network_security"],
    "vba": ["application_security", "endpoint_security"],
    "vde": ["endpoint_security"],
    "vdi": ["endpoint_security", "security_architecture"],
    "vlan": ["network_security", "security_architecture"],
    "vm": ["cloud_security", "security_architecture"],
    "voip": ["network_security"],
    "vpc": ["cloud_security", "network_security"],
    "vpn": ["network_security", "cryptography"],
    "waf": ["application_security", "network_security"],
    "wep": ["wireless_security", "cryptography"],
    "wids": ["wireless_security", "detection_response"],
    "wips": ["wireless_security", "detection_response"],
    "wo": ["governance_risk_compliance"],
    "wpa": ["wireless_security", "cryptography"],
    "wpa2": ["wireless_security", "cryptography"],
    "wpa3": ["wireless_security", "cryptography"],
    "xdr": ["detection_response", "endpoint_security"],
    "xml": ["application_security"],
    "xor": ["cryptography"],
    "xsrf": ["application_security"],
    "xss": ["application_security"],
}

AMBIGUOUS_ACRONYM_TOKENS = {
    "ap",
    "ca",
    "ha",
    "im",
    "ip",
    "ir",
    "mac",
    "os",
    "se",
    "wo",
}

RULES = [
    (
        "application_security",
        8,
        [
            r"\bapi\b",
            r"\bapplication programming interface\b",
            r"\bapplication security\b",
            r"\bbuffer overflow\b",
            r"\bcode vulnerabilit",
            r"\bdeveloping an application\b",
            r"\bcontent switch",
            r"\bcookies?\b",
            r"\bdeny ?list",
            r"\bcross[- ]site\b",
            r"\ballow ?list",
            r"\bapplication allow",
            r"\bcsrf\b",
            r"\bcss\b",
            r"\bdevsecops\b",
            r"\bdynamic application security testing\b",
            r"\bhtml\b",
            r"\binput validation\b",
            r"\bqa process\b",
            r"\brad\b",
            r"\brapid application development\b",
            r"\brace condition\b",
            r"\bsast\b",
            r"\bsdlc\b",
            r"\bsdlm\b",
            r"\bsecure coding\b",
            r"\bsoftware development\b",
            r"\bstatic analyzer\b",
            r"\bsql injection\b",
            r"\bsqli\b",
            r"\bstatic code analysis\b",
            r"\bstatic application security testing\b",
            r"\btechnical debt\b",
            r"\buat\b",
            r"\buser acceptance testing\b",
            r"\bweb application\b",
            r"\bwaf\b",
            r"\bxml-based\b",
            r"\bsoap\b",
            r"\bxss\b",
            r"\bxsrf\b",
        ],
    ),
    (
        "asset_management",
        8,
        [
            r"\basset inventory\b",
            r"\basset management\b",
            r"\basset tag\b",
            r"\beol\b",
            r"\beosl\b",
            r"\bhardware modifications\b",
            r"\blegacy (device|system)",
            r"\blegacy/unsupported\b",
            r"\blifecycle\b",
            r"\bup-to-date list of all systems\b",
            r"\bvendor support\b",
        ],
    ),
    (
        "authentication",
        8,
        [
            r"\b802\.1x\b",
            r"\bactive directory\b",
            r"\bauthentication\b",
            r"\bauthenticator\b",
            r"\bbiometric",
            r"\bchap\b",
            r"\beap\b",
            r"\bfederated sso\b",
            r"\bfrr\b",
            r"\bhotp\b",
            r"\bidp\b",
            r"\bkerberos\b",
            r"\bkdc\b",
            r"\bldap\b",
            r"\bmfa\b",
            r"\bmultifactor\b",
            r"\bmutual authentication\b",
            r"\bopenid\b",
            r"\bpap\b",
            r"\bpassword\b",
            r"\bpin\b",
            r"\bradius\b",
            r"\bsaml\b",
            r"\bsingle sign[- ]on\b",
            r"\bsso\b",
            r"\btacacs",
            r"\btgt\b",
            r"\btotp\b",
        ],
    ),
    (
        "authorization",
        8,
        [
            r"\babac\b",
            r"\baccess control\b",
            r"\baccess control list\b",
            r"\bacl\b",
            r"\bauthorization\b",
            r"\bdac\b",
            r"\bdiscretionary access control\b",
            r"\bgeolocation\b",
            r"\bmac \(mandatory access control\)",
            r"\bmandatory access control\b",
            r"\boauth\b",
            r"\bpermission",
            r"\bpolicy administrator\b",
            r"\bpolicy decision point\b",
            r"\bpolicy enforcement point\b",
            r"\bpolicy engine\b",
            r"\bprivilege",
            r"\brbac\b",
            r"\brule-based access control\b",
            r"\bsecurity level",
        ],
    ),
    (
        "automation_orchestration",
        8,
        [
            r"\bautomation\b",
            r"\bcontinuous integration\b",
            r"\bcontinuous .*coll",
            r"\binfrastructure as code\b",
            r"\biac\b",
            r"\borchestration\b",
            r"\bscap\b",
            r"\bsoar\b",
        ],
    ),
    (
        "business_continuity_disaster_recovery",
        8,
        [
            r"\b3-2-1\b",
            r"\bactive/active\b",
            r"\bactive/passive\b",
            r"\bavailability\b",
            r"\bbackup\b",
            r"\bbackups\b",
            r"\bbcp\b",
            r"\bbia\b",
            r"\bbusiness continuity\b",
            r"\bbusiness impact analysis\b",
            r"\bcold site\b",
            r"\bcoop\b",
            r"\bdifferential\b",
            r"\bdisaster recovery\b",
            r"\bdowntime\b",
            r"\bdrp\b",
            r"\bfailover\b",
            r"\bfault tolerance\b",
            r"\bfull incremental\b",
            r"\bgenerator\b",
            r"\bgeographical dispersion\b",
            r"\bha\b",
            r"\bhigh availability\b",
            r"\bhot site\b",
            r"\bincremental\b",
            r"\bjournaling\b",
            r"\bmtbf\b",
            r"\bmttf\b",
            r"\bmttr\b",
            r"\bpower supply\b",
            r"\bpower infrastructure\b",
            r"\bquickly restoring availability\b",
            r"\braid\b",
            r"\brepair\b",
            r"\brecovery point objective\b",
            r"\brecovery time objective\b",
            r"\bredundancy\b",
            r"\bredundant\b",
            r"\breplication\b",
            r"\bresponsiveness\b",
            r"\bresponse time\b",
            r"\brestore\b",
            r"\brestoration order\b",
            r"\brpo\b",
            r"\brto\b",
            r"\bspof\b",
            r"\btape\b",
            r"\bups\b",
            r"\buptime\b",
            r"\bwarm site\b",
        ],
    ),
    (
        "change_management",
        8,
        [
            r"\bbackout plan\b",
            r"\bchange management\b",
            r"\bchange fails\b",
            r"\brollback\b",
            r"\bwork order\b",
        ],
    ),
    (
        "cloud_security",
        8,
        [
            r"\bcasb\b",
            r"\bcloud\b",
            r"\bcompute engine\b",
            r"\bcontainer",
            r"\belasticity\b",
            r"\badditional resources\b",
            r"\bfaas\b",
            r"\biaas\b",
            r"\bmicroservices\b",
            r"\bpaas\b",
            r"\bsaas\b",
            r"\bserverless\b",
            r"\bscalability\b",
            r"\bscaling\b",
            r"\bvirtualization\b",
            r"\bvirtual private cloud\b",
            r"\bvpc\b",
        ],
    ),
    (
        "cryptography",
        8,
        [
            r"\b3des\b",
            r"\baes\b",
            r"\basymmetric\b",
            r"\bbcrypt\b",
            r"\bblock cipher\b",
            r"\bcertificate\b",
            r"\bcertificate authority\b",
            r"\bca tiers\b",
            r"\bcertificate pinning\b",
            r"\bcertificate revocation\b",
            r"\bcipher\b",
            r"\bcrl\b",
            r"\bcryptograph",
            r"\bcsr\b",
            r"\b\.der\b",
            r"\bder format\b",
            r"\bbinary certificates\b",
            r"\bdes algorithm\b",
            r"\balgorithm uses key length of 56 bits\b",
            r"\bdata encryption standard\b",
            r"\boffline root ca\b",
            r"\bonline issuing ca\b",
            r"\bdiffie",
            r"\bdigital signature\b",
            r"\bdsa\b",
            r"\becc\b",
            r"\becdhe\b",
            r"\becdsa\b",
            r"\bencryption\b",
            r"\bencrypted\b",
            r"\bgcmp\b",
            r"\bhash",
            r"\bhmac\b",
            r"\bhsm\b",
            r"\bin the clear\b",
            r"\biv\b",
            r"\bkey escrow\b",
            r"\bmd5\b",
            r"\bmessage authentication code\b",
            r"\bmessage integrity check\b",
            r"\bmic\b",
            r"\bnon[- ]repudiation\b",
            r"\bocsp\b",
            r"\bp12\b",
            r"\bpbkdf2\b",
            r"\bpem\b",
            r"\bperfect forward secrecy\b",
            r"\bpfx\b",
            r"\bpgp\b",
            r"\bpkcs\b",
            r"\bpki\b",
            r"\bprivate key\b",
            r"\bproof of origin\b",
            r"\bpublic key\b",
            r"\brainbow",
            r"\brc4\b",
            r"\bripemd\b",
            r"\brsa\b",
            r"\bs/mime\b",
            r"\bsalt\b",
            r"\bscep\b",
            r"\bsha",
            r"\bstream cipher\b",
            r"\bstream ciphers\b",
            r"\bsymmetric\b",
            r"\bsecure communication\b",
            r"\bsecure connection\b",
            r"\btls\b",
            r"\btpm\b",
            r"\bunencrypted\b",
            r"\bxor\b",
        ],
    ),
    (
        "data_security",
        8,
        [
            r"\bclassified data\b",
            r"\bclassify\b",
            r"\bconfidential data\b",
            r"\bcritical data\b",
            r"\bdata at rest\b",
            r"\bdata classification\b",
            r"\bdata in transit\b",
            r"\bdata in use\b",
            r"\bdata loss prevention\b",
            r"\bdata owner\b",
            r"\bdata protection\b",
            r"\bdata sanitization\b",
            r"\bdata sensitivity\b",
            r"\bdata types\b",
            r"\bdifferent levels of sensitivity\b",
            r"\bmanagement and protection of data\b",
            r"\bmost senior in an organization\b",
            r"\bdegaussing\b",
            r"\bdecommission",
            r"\bdlp\b",
            r"\bdrilling\b",
            r"\befs\b",
            r"\bexfiltration\b",
            r"\bfde\b",
            r"\bfile encryption\b",
            r"\bglba\b",
            r"\bintellectual property\b",
            r"\bmanagement of data\b",
            r"\bmasking\b",
            r"\bobfuscation\b",
            r"\bpersonal health information\b",
            r"\bpersonally identifiable information\b",
            r"\bphi\b",
            r"\bpii\b",
            r"\bpoint of attack\b",
            r"\bprivate data\b",
            r"\bprivate, classified, or restricted\b",
            r"\bproprietary data\b",
            r"\bpublic or unclassified\b",
            r"\bpulping\b",
            r"\bpulverizing\b",
            r"\bcpu/ram\b",
            r"\bcpu\b",
            r"\bsanitiz",
            r"\bsecret\b",
            r"\bsensitive data\b",
            r"\bsecure erase\b",
            r"\bsed\b",
            r"\bshredd",
            r"\bsteganography\b",
            r"\bstorage device\b",
            r"\bssds?\b",
            r"\btokenization\b",
            r"\btrade secret",
        ],
    ),
    (
        "detection_response",
        8,
        [
            r"\balert",
            r"\banomal",
            r"\bcanary token\b",
            r"\bdetection\b",
            r"\bedr\b",
            r"\bfile integrity monitor\b",
            r"\bfalse negative\b",
            r"\bfalse positive\b",
            r"\bhids\b",
            r"\bhips\b",
            r"\bhoney(file|net|pot|token)",
            r"\bids\b",
            r"\bintrusion detection\b",
            r"\bintrusion prevention\b",
            r"\bips\b",
            r"\bnids\b",
            r"\bnips\b",
            r"\bsiems?\b",
            r"\bsignature update",
            r"\bsuspicious activity\b",
            r"\bthreat hunting\b",
            r"\bwids\b",
            r"\bwips\b",
            r"\bxdr\b",
        ],
    ),
    (
        "digital_forensics",
        8,
        [
            r"\bbit-by-bit\b",
            r"\bchain of custody\b",
            r"\bdd\b",
            r"\bevidence\b",
            r"\bforensic",
            r"\bhashes for provenance\b",
            r"\blegal hold\b",
            r"\bprovenance\b",
        ],
    ),
    (
        "email_security",
        8,
        [
            r"\bdkim\b",
            r"\bdmarc\b",
            r"\bemail\b",
            r"\bemails\b",
            r"\bimap\b",
            r"\bimaps\b",
            r"\bmail gateway\b",
            r"\bmail messages\b",
            r"\bpop3?\b",
            r"\bpop3s\b",
            r"\bs/mime\b",
            r"\bsender policy framework\b",
            r"\bsmtp\b",
            r"\bsmtps\b",
            r"\bspf\b",
            r"\bwebmail\b",
        ],
    ),
    (
        "endpoint_security",
        8,
        [
            r"\bantivirus\b",
            r"\baslr\b",
            r"\bautorun\b",
            r"\bbash\b",
            r"\bbios\b",
            r"\bbloatware\b",
            r"\bedr\b",
            r"\bendpoint\b",
            r"\bfirmware\b",
            r"\bhost-based\b",
            r"\bintune\b",
            r"\bos\b",
            r"\boperating system\b",
            r"\boperating systems\b",
            r"\brootkit\b",
            r"\bsecure boot\b",
            r"\bselinux\b",
            r"\bsfc\b",
            r"\btripwire\b",
            r"\buefi\b",
            r"\busb\b",
            r"\bworkstation\b",
            r"\bxdr\b",
        ],
    ),
    (
        "governance_risk_compliance",
        8,
        [
            r"\bacceptable use policy\b",
            r"\badministrative controls?\b",
            r"\bale\b",
            r"\baro\b",
            r"\battestation\b",
            r"\baudit",
            r"\baup\b",
            r"\bbilateral nda\b",
            r"\bbusiness partner agreement\b",
            r"\bbusiness partners agreement\b",
            r"\bccpa\b",
            r"\bchange control\b",
            r"\bcompliance\b",
            r"\bdue care\b",
            r"\bdue diligence\b",
            r"\bef\b",
            r"\bexposure factor\b",
            r"\bgdpr\b",
            r"\bgap analysis\b",
            r"\bglba\b",
            r"\bgovernance\b",
            r"\bhipaa\b",
            r"\biso\b",
            r"\bkyc\b",
            r"\blegal\b",
            r"\bmemorandum\b",
            r"\bmoa\b",
            r"\bmou\b",
            r"\bmsa\b",
            r"\bnda\b",
            r"\bnist\b",
            r"\bpci\b",
            r"\bpolicy\b",
            r"\bstandard operating procedures?\b",
            r"\bprivacy\b",
            r"\bregulat",
            r"\bright to be forgotten\b",
            r"\brisk\b",
            r"\bsla\b",
            r"\bsle\b",
            r"\bsop\b",
            r"\bsow\b",
            r"\bsox\b",
            r"\bthird[- ]party\b",
            r"\bvendor\b",
        ],
    ),
    (
        "hardening",
        8,
        [
            r"\bbaseline\b",
            r"\bbaselines\b",
            r"\bcis\b",
            r"\bconfiguration management\b",
            r"\bdefault login\b",
            r"\bdisable unnecessary\b",
            r"\bpre-installed by manufacturer\b",
            r"\bgroup policy\b",
            r"\bgpo\b",
            r"\bhardening\b",
            r"\bos hardening\b",
            r"\bpatch management\b",
            r"\bpatching\b",
            r"\bpurpose-built devices\b",
            r"\bsecurity benchmark\b",
            r"\bsecurity settings\b",
            r"\bsecurity updates\b",
            r"\bunused applications\b",
            r"\bsoftware that is not used\b",
            r"\bupdate\b",
        ],
    ),
    (
        "identity_access_management",
        8,
        [
            r"\baccounting\b",
            r"\baccount lockout\b",
            r"\bactive directory\b",
            r"\bcredential management\b",
            r"\bfederation\b",
            r"\bidentity\b",
            r"\bidentity and access management\b",
            r"\biam\b",
            r"\bidp\b",
            r"\boffboarding\b",
            r"\bonboarding\b",
            r"\bsso\b",
            r"\buser information\b",
        ],
    ),
    (
        "incident_response",
        8,
        [
            r"\bcontainment\b",
            r"\bcirt\b",
            r"\bcsirt\b",
            r"\beradication\b",
            r"\bidentification\b",
            r"\bincident response\b",
            r"\birp\b",
            r"\bir lifecycle\b",
            r"\blessons learned\b",
            r"\bpicerl\b",
            r"\bpdacerl\b",
            r"\bpreparation\b",
            r"\brecovery\b",
            r"\bstakeholder",
            r"\btabletop\b",
        ],
    ),
    (
        "logging_monitoring",
        8,
        [
            r"\baudit log",
            r"\bauth logs?\b",
            r"\bevent id\b",
            r"\bevent log",
            r"\blog analysis\b",
            r"\blogging\b",
            r"\blog management\b",
            r"\bmonitoring\b",
            r"\bpacket capture\b",
            r"\bpcap\b",
            r"\bpolling\b",
            r"\bsecurity data source",
            r"\bsiems?\b",
            r"\bsnmp\b",
            r"\bsyslog\b",
            r"\btrap\b",
            r"\btry to log\b",
            r"\bvar/log\b",
            r"\bwindows event\b",
        ],
    ),
    (
        "malware_analysis",
        8,
        [
            r"\banti[- ]virus\b",
            r"\bbackdoor\b",
            r"\bbotnet\b",
            r"\bc2\b",
            r"\bcommand and control\b",
            r"\bmalware\b",
            r"\bransomware\b",
            r"\brat\b",
            r"\bremote access trojan\b",
            r"\brootkit\b",
            r"\bsandbox\b",
            r"\btrojan\b",
            r"\bvirus\b",
            r"\bworm\b",
        ],
    ),
    (
        "mobile_security",
        8,
        [
            r"\bbring your own device\b",
            r"\bbyod\b",
            r"\bchoose your own device\b",
            r"\bcope\b",
            r"\bcyod\b",
            r"\besn\b",
            r"\bgeofenc",
            r"\bmdm\b",
            r"\bmobile\b",
            r"\bota\b",
            r"\botg\b",
            r"\bsmartphone\b",
            r"\btablet\b",
            r"\buem\b",
        ],
    ),
    (
        "network_security",
        8,
        [
            r"\bacl\b",
            r"\baddressing scheme\b",
            r"\bagent-based content filters?\b",
            r"\bagent-based filtering\b",
            r"\bagent-based web filtering\b",
            r"\barp\b",
            r"\bcontent filters?\b",
            r"\bbgp\b",
            r"\bbridges and switches\b",
            r"\bdhcp\b",
            r"\bdmz\b",
            r"\bdnat\b",
            r"\bdns\b",
            r"\bdata center\b",
            r"\bdatagram",
            r"\bfirewalls?\b",
            r"\bfiber[- ]optic\b",
            r"\bforward proxy\b",
            r"\bftp\b",
            r"\bicmp\b",
            r"\bin-line device\b",
            r"\bin-line security device",
            r"\binternet protocol\b",
            r"\bipsec\b",
            r"\blan\b",
            r"\blayer 2\b",
            r"\blayer 3\b",
            r"\blayer 4\b",
            r"\bleased lines?\b",
            r"\bgateways?\b",
            r"\bjump server\b",
            r"\bload balancers?\b",
            r"\bline printer daemon\b",
            r"\bmac address\b",
            r"\bmpls\b",
            r"\bnac\b",
            r"\bnat\b",
            r"\bnetwork\b",
            r"\bngfw\b",
            r"\bopen port\b",
            r"\bpacket",
            r"\bpat\b",
            r"\bport (20|21|22|25|49|53|80|88|110|123|143|443|445|500|636|993|1433|3389|5060)\b",
            r"\bport (515|6667|8080|989|990|995)\b",
            r"\bport address translation\b",
            r"\bport security\b",
            r"\bproxy\b",
            r"\bquality of service\b",
            r"\breputation\b",
            r"\bradius\b",
            r"\brdp\b",
            r"\breverse proxy\b",
            r"\brouting\b",
            r"\brstp\b",
            r"\bsd-wan\b",
            r"\bsdn\b",
            r"\bsegmentation\b",
            r"\bsftp\b",
            r"\bsnmp\b",
            r"\bssh\b",
            r"\btacacs",
            r"\btcp\b",
            r"\btcp/ip\b",
            r"\bt1 line\b",
            r"\btransport layer\b",
            r"\bend-to-end communication\b",
            r"\buri/uid\b",
            r"\bunique 48-bit\b",
            r"\bunique .*bit address\b",
            r"\budp\b",
            r"\butms?\b",
            r"\burl filters?\b",
            r"\bvlan\b",
            r"\bvpn\b",
        ],
    ),
    (
        "operational_technology",
        8,
        [
            r"\bembedded\b",
            r"\bics\b",
            r"\biot\b",
            r"\bot\b",
            r"\breal[- ]time operating systems?\b",
            r"\brtos\b",
            r"\bscada\b",
        ],
    ),
    (
        "physical_security",
        8,
        [
            r"\baccess badge\b",
            r"\baccess control vestibule\b",
            r"\basset tag\b",
            r"\bbarricade",
            r"\bbollard",
            r"\bcamera",
            r"\bcctv\b",
            r"\bdoor\b",
            r"\bfaraday cage\b",
            r"\bfence\b",
            r"\bfences\b",
            r"\bfencing\b",
            r"\bguard\b",
            r"\bhvac\b",
            r"\binfrared\b",
            r"\blight",
            r"\blockbox\b",
            r"\bmantrap\b",
            r"\bmicrowave\b",
            r"\bmotion\b",
            r"\bphysical\b",
            r"\bpressure sensor\b",
            r"\bsecurity guard\b",
            r"\bsensor\b",
            r"\bultrasonic\b",
            r"\buav\b",
            r"\bvideo surveillance\b",
            r"\bwindow sensors?\b",
        ],
    ),
    (
        "security_architecture",
        8,
        [
            r"\bcia triad\b",
            r"\bcompensating control\b",
            r"\bcontrol category\b",
            r"\bcontrol type\b",
            r"\bcontrol plane\b",
            r"\bcorrective\b",
            r"\bcorrective control\b",
            r"\bdata plane\b",
            r"\bdetective control\b",
            r"\bdeterrent\b",
            r"\bdirective control\b",
            r"\bfail[- ]closed\b",
            r"\bfail[- ]open\b",
            r"\bfunctional plane\b",
            r"\bimplicit deny\b",
            r"\bmanagerial controls?\b",
            r"\bmanaged securely\b",
            r"\bmicrosegmentation\b",
            r"\boperational controls?\b",
            r"\bpreventive control\b",
            r"\bpreventive\b",
            r"\bsecure zones?\b",
            r"\bsecurity architecture\b",
            r"\bsecurity controls?\b",
            r"\bsecurity zones?\b",
            r"\bsubject role\b",
            r"\btechnical controls?\b",
            r"\bthreat scope reduction\b",
            r"\btrust scoring\b",
            r"\btrusted zone\b",
            r"\buntrusted zone\b",
            r"\bdpi\b",
            r"\bzero trust\b",
        ],
    ),
    (
        "security_awareness",
        8,
        [
            r"\bawareness\b",
            r"\bcbt\b",
            r"\bcomputer based training\b",
            r"\beducat",
            r"\bimpersonation\b",
            r"\bpersonal details\b",
            r"\bphishing\b",
            r"\bphishing simulation\b",
            r"\bphone call\b",
            r"\bsecurity training\b",
            r"\bsocial engineering\b",
            r"\btraining\b",
        ],
    ),
    (
        "security_operations",
        5,
        [
            r"\bmssp\b",
            r"\bblue team\b",
            r"\bcentralized management\b",
            r"\bpurple team\b",
            r"\bred team\b",
            r"\bsecurity operations\b",
            r"\bsoc\b",
            r"\bteam sets the rules\b",
            r"\bwhite team\b",
        ],
    ),
    (
        "threat_intelligence",
        8,
        [
            r"\badvisories\b",
            r"\bapt\b",
            r"\bapts\b",
            r"\batt&ck\b",
            r"\bbulletin",
            r"\bcyber kill chain\b",
            r"\bcta\b",
            r"\bdark web\b",
            r"\bindicator of compromise\b",
            r"\bioc\b",
            r"\bosint\b",
            r"\bstix\b",
            r"\btactics, techniques\b",
            r"\btaxii\b",
            r"\bthreat actor\b",
            r"\bthreat actors\b",
            r"\bthreat feed\b",
            r"\bthreat intelligence\b",
            r"\btTP\b".lower(),
        ],
    ),
    (
        "threats_attacks",
        8,
        [
            r"\barp poisoning\b",
            r"\battack vector\b",
            r"\battacker",
            r"\battack opportunity\b",
            r"\bbluejacking\b",
            r"\bbrute[- ]force\b",
            r"\bcaptive portal\b",
            r"\bddos\b",
            r"\bdns poisoning\b",
            r"\bdos\b",
            r"\bevil twin\b",
            r"\bgolden ticket\b",
            r"\bhacktivist\b",
            r"\bhactivist\b",
            r"\bhybrid warfare\b",
            r"\bimpersonation\b",
            r"\binfluence campaign\b",
            r"\binsider threat\b",
            r"\bjamming\b",
            r"\bkerberoasting\b",
            r"\bmac filtering\b",
            r"\bmalicious\b",
            r"\bmisinformation\b",
            r"\bdisinformation\b",
            r"\bpoisoning\b",
            r"\bphishing\b",
            r"\bpharming\b",
            r"\brainbow attack\b",
            r"\breplay attack\b",
            r"\breplay attacks\b",
            r"\bsilver ticket\b",
            r"\bsmishing\b",
            r"\bspoofing\b",
            r"\bthreat vector\b",
            r"\bunskilled attacker\b",
            r"\bvishing\b",
            r"\bwatering hole\b",
            r"\bwhaling\b",
        ],
    ),
    (
        "vulnerability_management",
        8,
        [
            r"\bcve\b",
            r"\bcvss\b",
            r"\bexploit\b",
            r"\bfalse negative\b",
            r"\bfalse positive\b",
            r"\bmisconfiguration\b",
            r"\bmitigation\b",
            r"\bpatch tuesday\b",
            r"\bpenetration test",
            r"\bscanner\b",
            r"\bsignature update",
            r"\bvulnerab",
        ],
    ),
    (
        "wireless_security",
        8,
        [
            r"\baccess point\b",
            r"\bbluetooth\b",
            r"\bcaptive portal\b",
            r"\beap-tls\b",
            r"\beap-ttls\b",
            r"\bevil twin\b",
            r"\bfox hunt\b",
            r"\bjamming\b",
            r"\bmac filtering\b",
            r"\bnfc\b",
            r"\bpeap\b",
            r"\bradio frequency\b",
            r"\brf\b",
            r"\brfid\b",
            r"\bsite survey\b",
            r"\bspectrum analyzer\b",
            r"\bssid\b",
            r"\bwi-fi\b",
            r"\bwids\b",
            r"\bwips\b",
            r"\bwireless\b",
            r"\bwpa\b",
            r"\bwpa2\b",
            r"\bwpa3\b",
        ],
    ),
]

COMPILED_RULES = [
    (tag, weight, [re.compile(pattern, flags=re.IGNORECASE) for pattern in patterns])
    for tag, weight, patterns in RULES
]


def normalize_key(value: str | None) -> str:
    value = html.unescape(value or "").strip().lower()
    value = value.replace("&amp;", "&")
    value = re.sub(r"[\s:/]+", "_", value)
    value = re.sub(r"[^a-z0-9_+.-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value


def searchable_text(*parts: str | None) -> str:
    raw = html.unescape("\n".join(part or "" for part in parts)).lower()
    return re.sub(r"\s+", " ", raw)


def parse_tags(raw: str | None) -> list[str]:
    try:
        parsed = json.loads(raw or "[]")
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    tags = []
    for tag in parsed:
        if isinstance(tag, str) and tag.strip():
            tags.append(tag.strip())
    return tags


def add_score(
    scores: collections.Counter[str],
    evidence: dict[str, list[str]],
    tag: str,
    weight: int,
    reason: str,
) -> None:
    if tag not in FINAL_TAG_SET:
        raise ValueError(f"Unknown target tag: {tag}")
    scores[tag] += weight
    if len(evidence[tag]) < 6:
        evidence[tag].append(reason)


def classify_card(row: sqlite3.Row) -> tuple[list[str], int, dict[str, list[str]]]:
    old_tags = parse_tags(row["tags_json"])
    text = searchable_text(row["front"], row["back"], row["deck_name"])
    deck_key = normalize_key(row["deck_name"])
    front_key = html.unescape((row["front"] or "").strip()).lower()
    front_key = re.sub(r"\s+", " ", front_key)

    scores: collections.Counter[str] = collections.Counter()
    evidence: dict[str, list[str]] = collections.defaultdict(list)

    for tag in old_tags:
        for hinted in OLD_TAG_HINTS.get(normalize_key(tag), []):
            add_score(scores, evidence, hinted, 3, f"old_tag:{tag}")

    for hinted in DECK_HINTS.get(deck_key, []):
        add_score(scores, evidence, hinted, 4, f"deck:{row['deck_name']}")

    for hinted in ACRONYM_TAGS.get(front_key, []):
        add_score(scores, evidence, hinted, 12, f"front:{row['front']}")

    tokens = set(re.findall(r"[a-z0-9][a-z0-9/+.-]*", text))
    for token in sorted(tokens):
        if token in AMBIGUOUS_ACRONYM_TOKENS:
            continue
        for hinted in ACRONYM_TAGS.get(token, []):
            add_score(scores, evidence, hinted, 6, f"token:{token}")

    for tag, weight, patterns in COMPILED_RULES:
        matches = 0
        for pattern in patterns:
            if pattern.search(text):
                matches += 1
                add_score(scores, evidence, tag, weight, f"pattern:{pattern.pattern}")
                if matches >= 3:
                    break

    if not scores:
        # Last-resort fallback for active Security+ decks. These are still review-exported
        # separately, but the live database must not retain empty/non-security tags.
        add_score(scores, evidence, "security_operations", 1, "fallback:security_plus_context")

    ranked = sorted(
        scores.items(),
        key=lambda item: (-item[1], TAG_PRIORITY[item[0]], item[0]),
    )
    best_score = ranked[0][1]
    selected: list[str] = []
    for tag, score in ranked:
        if len(selected) >= 3:
            break
        if score >= 8 or score >= best_score - 4 or len(selected) == 0:
            selected.append(tag)

    selected = remove_redundant_tags(selected, scores)
    return selected[:3], best_score, dict(evidence)


def remove_redundant_tags(tags: list[str], scores: collections.Counter[str]) -> list[str]:
    result = list(dict.fromkeys(tags))

    def drop(tag: str) -> None:
        if tag in result and len(result) > 1:
            result.remove(tag)

    if "authentication" in result and "identity_access_management" in result:
        if scores["authentication"] >= scores["identity_access_management"]:
            drop("identity_access_management")
    if "authorization" in result and "identity_access_management" in result:
        if scores["authorization"] >= scores["identity_access_management"]:
            drop("identity_access_management")
    if "wireless_security" in result and "network_security" in result:
        if scores["wireless_security"] >= scores["network_security"]:
            drop("network_security")
    if "email_security" in result and "network_security" in result:
        if scores["email_security"] >= scores["network_security"]:
            drop("network_security")
    if "malware_analysis" in result and "threats_attacks" in result:
        if scores["malware_analysis"] >= scores["threats_attacks"]:
            drop("threats_attacks")
    if "digital_forensics" in result and "incident_response" in result:
        if scores["digital_forensics"] >= scores["incident_response"]:
            drop("incident_response")
    if "business_continuity_disaster_recovery" in result and "security_architecture" in result:
        if scores["business_continuity_disaster_recovery"] >= scores["security_architecture"]:
            drop("security_architecture")
    return result


def is_review_or_unvalidated(row: sqlite3.Row, old_tags: list[str]) -> bool:
    lowered = {tag.lower().strip() for tag in old_tags}
    deck_name = (row["deck_name"] or "").lower()
    deck_id = (row["deck_id"] or "").lower()
    has_review_marker = (
        "needs_review" in lowered
        or "review" in lowered
        or deck_name.startswith("review ")
        or deck_id.startswith("needs-review")
    )
    is_validated = "validated" in lowered
    return has_review_marker or not is_validated


def card_export(row: sqlite3.Row, old_tags: list[str], new_tags: list[str]) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "question": row["front"] or "",
        "answer": row["back"] or "",
        "existing_tags": old_tags,
        "new_tags": new_tags,
    }


def untagged_export(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "question": row["front"] or "",
        "answer": row["back"] or "",
        "reason": "No confident tag match",
    }


def load_cards(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          c.user_id,
          c.id,
          c.deck_id,
          COALESCE(d.name, '') AS deck_name,
          c.front,
          c.back,
          c.tags_json,
          c.updated_at
        FROM server_cards c
        LEFT JOIN server_decks d
          ON d.id = c.deck_id
         AND d.user_id = c.user_id
        WHERE IFNULL(c.is_deleted, 0) = 0
          AND c.deleted_at IS NULL
        ORDER BY c.user_id, c.id
        """
    ).fetchall()


def analyze_existing_tags(cards: list[sqlite3.Row]) -> dict:
    counts: collections.Counter[str] = collections.Counter()
    duplicate_tag_cards = 0
    no_tag_cards = 0
    for row in cards:
        tags = parse_tags(row["tags_json"])
        counts.update(tags)
        if len(tags) == 0:
            no_tag_cards += 1
        if len(tags) != len(set(tags)):
            duplicate_tag_cards += 1

    analysis = []
    for tag, count in sorted(counts.items(), key=lambda item: (-item[1], item[0].lower())):
        key = normalize_key(tag)
        if tag.lower() != tag or "_" not in tag:
            issue = "inconsistent_naming"
        else:
            issue = "legacy_specific"
        if key in INVALID_OR_OPERATIONAL_TAGS:
            issue = "generic_operational_or_forbidden"
        elif key in OLD_TAG_HINTS:
            issue = "legacy_topic_tag"
        analysis.append({"tag": tag, "count": count, "issue": issue})
    return {
        "existing_tag_counts": analysis,
        "cards_without_tags_before": no_tag_cards,
        "cards_with_duplicate_tags_before": duplicate_tag_cards,
    }


def build_normalization(cards: list[sqlite3.Row]) -> dict:
    rows = []
    review_cards = []
    untagged_cards = []
    old_to_new: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
    final_counts: collections.Counter[str] = collections.Counter()
    changed_cards = 0
    removed_old_instances = 0
    corrected_final_instances = 0
    low_confidence = []

    for row in cards:
        old_tags = parse_tags(row["tags_json"])
        new_tags, score, evidence = classify_card(row)
        final_counts.update(new_tags)
        for old_tag in old_tags:
            for new_tag in new_tags:
                old_to_new[old_tag][new_tag] += 1

        old_normalized = [normalize_key(tag) for tag in old_tags]
        if old_normalized != new_tags:
            changed_cards += 1
        removed_old_instances += sum(1 for tag in old_tags if normalize_key(tag) not in FINAL_TAG_SET)
        corrected_final_instances += len(new_tags)

        if score <= 1:
            untagged_cards.append(untagged_export(row))
            low_confidence.append({"id": row["id"], "user_id": row["user_id"], "score": score})

        if is_review_or_unvalidated(row, old_tags):
            review_cards.append(card_export(row, old_tags, new_tags))

        rows.append(
            {
                "user_id": row["user_id"],
                "id": row["id"],
                "old_tags": old_tags,
                "new_tags": new_tags,
                "score": score,
                "evidence": evidence,
            }
        )

    tag_mapping = {
        old_tag: [
            {"new_tag": tag, "count": count}
            for tag, count in counter.most_common()
        ]
        for old_tag, counter in sorted(old_to_new.items(), key=lambda item: item[0].lower())
    }

    stats = {
        "total_cards": len(cards),
        "cards_with_tag_changes": changed_cards,
        "corrected_final_tag_assignments": corrected_final_instances,
        "removed_old_tag_instances": removed_old_instances,
        "review_cards": len(review_cards),
        "unclassifiable_cards": len(untagged_cards),
    }

    return {
        "rows": rows,
        "review_cards": review_cards,
        "untagged_cards": untagged_cards,
        "tag_mapping": tag_mapping,
        "final_tag_counts": dict(sorted(final_counts.items())),
        "stats": stats,
        "low_confidence": low_confidence,
    }


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate_outputs(cards: list[sqlite3.Row], normalization: dict) -> list[str]:
    errors: list[str] = []
    seen = {(row["user_id"], row["id"]) for row in cards}
    if len(seen) != len(cards):
        errors.append("duplicate primary-key pairs in active cards")

    for item in normalization["rows"]:
        tags = item["new_tags"]
        if not (1 <= len(tags) <= 3):
            errors.append(f"invalid tag count for {item['user_id']}:{item['id']}: {tags}")
        if len(tags) != len(set(tags)):
            errors.append(f"duplicate normalized tags for {item['user_id']}:{item['id']}: {tags}")
        for tag in tags:
            if tag not in FINAL_TAG_SET:
                errors.append(f"unknown normalized tag for {item['user_id']}:{item['id']}: {tag}")
            if not re.fullmatch(r"[a-z0-9]+(?:_[a-z0-9]+)*", tag):
                errors.append(f"non-snake-case tag for {item['user_id']}:{item['id']}: {tag}")
            if tag in INVALID_OR_OPERATIONAL_TAGS:
                errors.append(f"forbidden tag retained for {item['user_id']}:{item['id']}: {tag}")
    return errors


def backup_database(conn: sqlite3.Connection) -> Path:
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_path = SERVER_ROOT / f"sync.db.before_tag_normalization_{timestamp}"
    backup_conn = sqlite3.connect(str(backup_path))
    try:
        conn.backup(backup_conn)
    finally:
        backup_conn.close()
    return backup_path


def apply_updates(conn: sqlite3.Connection, rows: list[dict]) -> None:
    now_ms = int(time.time() * 1000)
    created_at = int(time.time())
    update_index = 0
    for item in rows:
        if [normalize_key(tag) for tag in item["old_tags"]] == item["new_tags"]:
            continue
        index = update_index
        update_index += 1
        ts = now_ms + index
        tags_json = json.dumps(item["new_tags"], ensure_ascii=False)
        conn.execute(
            """
            UPDATE server_cards
               SET tags_json = ?,
                   updated_at = ?,
                   last_source_client = ?
             WHERE user_id = ?
               AND id = ?
            """,
            (tags_json, ts, SOURCE_CLIENT, item["user_id"], item["id"]),
        )

        op_id = f"{SOURCE}:{item['user_id']}:card.update:{item['id']}:{ts}"
        payload = {
            "cardId": item["id"],
            "updates": {"tags": item["new_tags"], "updatedAt": ts},
            "timestamp": ts,
        }
        conn.execute(
            """
            INSERT OR IGNORE INTO sync_operations
              (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
            VALUES (?, 'card.update', ?, ?, ?, ?, ?, ?)
            """,
            (
                op_id,
                json.dumps(payload, ensure_ascii=False),
                ts,
                SOURCE,
                SOURCE_CLIENT,
                created_at,
                item["user_id"],
            ),
        )


def verify_database(conn: sqlite3.Connection) -> dict:
    bad_rows = conn.execute(
        """
        SELECT user_id, id, tags_json
        FROM server_cards
        WHERE IFNULL(is_deleted, 0)=0
          AND deleted_at IS NULL
          AND (
            tags_json IS NULL
            OR json_array_length(tags_json) < 1
            OR json_array_length(tags_json) > 3
          )
        """
    ).fetchall()

    final_tag_rows = conn.execute(
        """
        SELECT json_each.value AS tag, COUNT(*) AS count
        FROM server_cards, json_each(server_cards.tags_json)
        WHERE IFNULL(is_deleted, 0)=0
          AND deleted_at IS NULL
        GROUP BY json_each.value
        ORDER BY tag
        """
    ).fetchall()

    non_final_tags = [
        {"tag": row["tag"], "count": row["count"]}
        for row in final_tag_rows
        if row["tag"] not in FINAL_TAG_SET
    ]

    duplicate_tag_cards = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM (
          SELECT c.user_id, c.id, COUNT(*) AS total, COUNT(DISTINCT json_each.value) AS distinct_total
          FROM server_cards c, json_each(c.tags_json)
          WHERE IFNULL(c.is_deleted, 0)=0
            AND c.deleted_at IS NULL
          GROUP BY c.user_id, c.id
          HAVING total != distinct_total
        )
        """
    ).fetchone()["count"]

    return {
        "invalid_tag_count_cards": [dict(row) for row in bad_rows],
        "non_final_tags": non_final_tags,
        "duplicate_tag_cards": duplicate_tag_cards,
        "final_tag_counts_after": {row["tag"]: row["count"] for row in final_tag_rows},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DB_PATH)
    parser.add_argument("--apply", action="store_true", help="Persist normalized tags to the database.")
    parser.add_argument("--no-backup", action="store_true")
    args = parser.parse_args()

    conn = sqlite3.connect(str(args.db), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=30000")
    cards = load_cards(conn)
    existing_analysis = analyze_existing_tags(cards)
    normalization = build_normalization(cards)
    validation_errors = validate_outputs(cards, normalization)
    if validation_errors:
        raise SystemExit("\n".join(validation_errors[:50]))

    report = {
        "database": str(args.db),
        "applied": args.apply,
        "final_tags": FINAL_TAGS,
        "existing_tag_analysis": existing_analysis,
        "tag_mapping_old_to_new": normalization["tag_mapping"],
        "final_tag_counts": normalization["final_tag_counts"],
        "stats": normalization["stats"],
        "low_confidence": normalization["low_confidence"],
    }

    backup_path = None
    if args.apply:
        if not args.no_backup:
            backup_path = backup_database(conn)
            report["backup_database"] = str(backup_path)
        with conn:
            apply_updates(conn, normalization["rows"])
        report["database_verification"] = verify_database(conn)

    write_json(WORKSPACE_ROOT / "review_cards_export.json", normalization["review_cards"])
    write_json(WORKSPACE_ROOT / "untagged_cards_export.json", normalization["untagged_cards"])
    write_json(WORKSPACE_ROOT / "final_tags.json", FINAL_TAGS)
    write_json(WORKSPACE_ROOT / "tag_mapping_old_to_new.json", normalization["tag_mapping"])
    write_json(WORKSPACE_ROOT / "tag_normalization_report.json", report)

    print(json.dumps(report["stats"], ensure_ascii=False, indent=2))
    if backup_path:
        print(f"backup_database={backup_path}")
    if args.apply:
        verification = report["database_verification"]
        print(
            "verification="
            + json.dumps(
                {
                    "invalid_tag_count_cards": len(verification["invalid_tag_count_cards"]),
                    "non_final_tags": verification["non_final_tags"],
                    "duplicate_tag_cards": verification["duplicate_tag_cards"],
                },
                ensure_ascii=False,
            )
        )
    else:
        print("[dry-run] Database was not modified.")


if __name__ == "__main__":
    main()
