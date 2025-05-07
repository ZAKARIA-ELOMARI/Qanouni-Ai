import os
import re
import json
import PyPDF2

def pdf_to_text(pdf_path):
    """
    Convertit un fichier PDF en une chaîne de caractères (texte brut).
    """
    try:
        base_name = os.path.splitext(pdf_path)[0]
        txt_path = f"{base_name}.txt"
        all_text = ""
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    all_text += f"\n\n--- Page {i + 1} ---\n{text}"
                else:
                    all_text += f"\n\n--- Page {i + 1} ---\n[No text extracted]"
        # Sauvegarde du texte brut dans un fichier
        with open(txt_path, "w", encoding="utf-8") as output_file:
            output_file.write(all_text)
        print(f"[PDF->TXT] Conversion réussie : {txt_path}")
        return all_text
    except Exception as e:
        print(f"[PDF->TXT] Erreur lors de la conversion de {pdf_path} : {e}")
        return ""

def nettoyer_texte(texte):
    """
    Nettoie le texte brut en supprimant les marqueurs de pages et en normalisant les espaces.
    """
    # Supprime les lignes indiquant les pages (exemple: "--- Page 3 ---")
    texte = re.sub(r"^--- Page \d+ ---\s*", "", texte, flags=re.MULTILINE)
    # Remplace les multiples espaces et retours à la ligne par un seul espace
    texte = re.sub(r"\s+", " ", texte)
    # Insère un retour à la ligne avant chaque mot-clé ("Chapitre", "Section", "Article")
    for mot in ["Chapitre", "Section", "Article"]:
        texte = re.sub(rf"({mot})", r"\n\1", texte)
    return texte.strip()

def nettoyer_titre(titre):
    """
    Nettoie le titre de la loi en éliminant les parties superflues.
    On recherche ici "LOUANGE A DIEU SEUL" pour ne conserver que la partie pertinente.
    """
    markers = ["LOUANGE A DIEU SEUL"]
    indices = [titre.find(m) for m in markers if titre.find(m) != -1]
    if indices:
        titre = titre[:min(indices)]
    return titre.strip()

def extraire_structure(texte):
    """
    Extrait la structure de la loi (titre, chapitres, sections, articles)
    à partir du texte nettoyé.
    """
    lignes = texte.split("\n")
    structure = {
        "titre_loi": "",
        "chapitres": []
    }
    # On considère que la première ligne non vide correspond au titre brut
    for ligne in lignes:
        if ligne.strip():
            titre_brut = ligne.strip()
            structure["titre_loi"] = nettoyer_titre(titre_brut)
            break

    # Initialisation des variables pour la structure
    current_chapitre = None
    current_section = None
    current_article = None

    # Fonction helper pour s'assurer qu'il y a un chapitre courant
    def get_default_chapitre():
        return {"titre": "Contenu Général", "sections": [], "articles": []}

    # Parcours du texte à partir de la deuxième ligne
    for ligne in lignes[1:]:
        ligne = ligne.strip()
        if not ligne:
            continue

        # Si on détecte un titre de chapitre
        match_chap = re.match(r"^(Chapitre.*)", ligne, re.IGNORECASE)
        if match_chap:
            # Si aucun chapitre n'a été défini jusqu'ici, créer un chapitre par défaut
            if current_chapitre is None:
                current_chapitre = get_default_chapitre()
            # Si un article est en cours, le sauvegarder
            if current_article is not None:
                if current_section is not None:
                    current_section["articles"].append(current_article)
                else:
                    current_chapitre["articles"].append(current_article)
                current_article = None
            # Si une section est en cours, la sauvegarder
            if current_section is not None:
                current_chapitre["sections"].append(current_section)
                current_section = None
            # Sauvegarder le chapitre courant et démarrer un nouveau
            structure["chapitres"].append(current_chapitre)
            current_chapitre = {
                "titre": match_chap.group(1).strip(),
                "sections": [],
                "articles": []
            }
            continue

        # Si on détecte un titre de section
        match_sec = re.match(r"^(Section.*)", ligne, re.IGNORECASE)
        if match_sec:
            # Si aucun chapitre n'est défini, créer un chapitre par défaut
            if current_chapitre is None:
                current_chapitre = get_default_chapitre()
            if current_article is not None:
                if current_section is not None:
                    current_section["articles"].append(current_article)
                else:
                    current_section = {"titre": "", "articles": []}
                    current_section["articles"].append(current_article)
                current_article = None
            if current_section is not None and current_section.get("titre"):
                current_chapitre["sections"].append(current_section)
            current_section = {
                "titre": match_sec.group(1).strip(),
                "articles": []
            }
            continue

        # Si on détecte un article
        match_art = re.match(r"^(Article\s+[\w\d]+)", ligne, re.IGNORECASE)
        if match_art:
            if current_chapitre is None:
                current_chapitre = get_default_chapitre()
            if current_article is not None:
                if current_section is not None:
                    current_section["articles"].append(current_article)
                else:
                    current_chapitre["articles"].append(current_article)
            current_article = {
                "numero": match_art.group(0).strip(),
                "contenu": ligne[len(match_art.group(0)):].strip()
            }
            continue

        # Sinon, on considère la ligne comme faisant partie du contenu de l'article courant
        if current_article is not None:
            current_article["contenu"] += " " + ligne

    # Sauvegarde des derniers éléments de la boucle
    if current_article is not None:
        if current_section is not None:
            current_section["articles"].append(current_article)
        else:
            current_chapitre["articles"].append(current_article)
    if current_section is not None:
        current_chapitre["sections"].append(current_section)
    if current_chapitre is not None:
        structure["chapitres"].append(current_chapitre)
    
    return structure

def traiter_pdf_file(pdf_file_path, output_raw_txt_dir, output_clean_txt_dir, output_json_dir):
    """
    Traite un fichier PDF en réalisant successivement :
      1. La conversion en TXT brut.
      2. Le nettoyage du TXT et l'extraction de sa structure.
      3. La sauvegarde du TXT brut, du TXT nettoyé et du JSON structuré.
    """
    print(f"Traitement du fichier PDF : {pdf_file_path}")
    # Conversion PDF -> TXT brut
    raw_text = pdf_to_text(pdf_file_path)
    base_name = os.path.splitext(os.path.basename(pdf_file_path))[0]
    
    # Sauvegarde du fichier TXT brut
    raw_txt_path = os.path.join(output_raw_txt_dir, base_name + ".txt")
    with open(raw_txt_path, "w", encoding="utf-8") as f_raw:
        f_raw.write(raw_text)
    
    # Nettoyage du texte
    clean_text = nettoyer_texte(raw_text)
    clean_txt_path = os.path.join(output_clean_txt_dir, base_name + "_clean.txt")
    with open(clean_txt_path, "w", encoding="utf-8") as f_clean:
        f_clean.write(clean_text)
    
    # Extraction de la structure et sauvegarde en JSON
    structure = extraire_structure(clean_text)
    json_path = os.path.join(output_json_dir, base_name + ".json")
    with open(json_path, "w", encoding="utf-8") as f_json:
        json.dump(structure, f_json, ensure_ascii=False, indent=2)
    
    print(f"Fichier traité : {base_name}")
    print(f"  TXT brut  -> {raw_txt_path}")
    print(f"  TXT net.  -> {clean_txt_path}")
    print(f"  JSON      -> {json_path}\n")

def traiter_dossier(input_dir, output_raw_txt_dir, output_clean_txt_dir, output_json_dir):
    """
    Parcourt récursivement le dossier d'entrée et traite tous les fichiers PDF qu'il contient.
    """
    if not os.path.exists(input_dir):
        print(f"Erreur : Le dossier d'entrée '{input_dir}' n'existe pas.")
        return

    os.makedirs(output_raw_txt_dir, exist_ok=True)
    os.makedirs(output_clean_txt_dir, exist_ok=True)
    os.makedirs(output_json_dir, exist_ok=True)

    pdf_files_found = False

    for root, _, files in os.walk(input_dir):
        for filename in files:
            if filename.lower().endswith(".pdf"):
                pdf_files_found = True
                pdf_path = os.path.join(root, filename)
                traiter_pdf_file(pdf_path, output_raw_txt_dir, output_clean_txt_dir, output_json_dir)

    if not pdf_files_found:
        print(f"Aucun fichier PDF trouvé dans le dossier (et sous-dossiers) : '{input_dir}'.")

def main():
    # Chemin vers le dossier contenant les PDFs à traiter (vous pouvez utiliser un chemin absolu)
    input_directory = "Lois/pdfs_fr"
    # Dossiers de sortie
    output_raw_txt_directory   = "Lois/pdfs_fr_txt_raw"
    output_clean_txt_directory = "Lois/pdfs_fr_txt_clean"
    output_json_directory      = "Lois/pdfs_fr_json"

    traiter_dossier(input_directory, output_raw_txt_directory, output_clean_txt_directory, output_json_directory)
    print("Traitement terminé.")

if __name__ == "__main__":
    main()
    # Pour exécuter le script, utilisez la commande suivante dans le terminal :
    # python law_cleaning.py



    