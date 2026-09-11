import chromadb

client = chromadb.HttpClient(host="localhost", port=8000)
col = client.get_collection("ppv")
print("Nombre de docs dans Chroma :", col.count())